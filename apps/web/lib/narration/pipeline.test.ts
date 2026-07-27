import assert from "node:assert/strict";
import {
  buildNarrationVersion,
  getOrCreateStoryNarrationForStory,
  hashStoryText,
  type StoryNarrationConfig,
  type StoryNarrationPipelineDeps,
  type StoryNarrationRecord
} from "./pipeline";
import { storyNarrationResponseSchema } from "./schema";

const story = {
  id: "40000000-0000-4000-8000-000000000010",
  childId: "10000000-0000-4000-8000-000000000001",
  storyText: "The bird flew to the moon."
};

const config: StoryNarrationConfig = {
  bucket: "story-narrations",
  signedUrlTtlSeconds: 3600,
  provider: "test-provider",
  voice: "test-voice",
  model: "test-model",
  speakingRate: "1.0",
  alignmentVersion: "test-align-v1"
};

const words = [
  { word: "The", start: 0, end: 0.28 },
  { word: "bird", start: 0.31, end: 0.72 }
];

const narrationVersion = buildNarrationVersion({
  storyText: story.storyText,
  config
});

const cachedRecord: StoryNarrationRecord = {
  id: "50000000-0000-4000-8000-000000000001",
  story_id: story.id,
  audio_path: `${story.childId}/${story.id}/${narrationVersion}.mp3`,
  mime_type: "audio/mpeg",
  duration_seconds: 1,
  word_timestamps: words,
  text_hash: hashStoryText(story.storyText),
  narration_version: narrationVersion
};

function makeDeps(overrides: Partial<StoryNarrationPipelineDeps> = {}) {
  const calls = {
    ml: 0,
    upload: 0,
    save: 0,
    sign: 0,
    remove: 0
  };

  const deps: StoryNarrationPipelineDeps = {
    async findCachedNarration() {
      return null;
    },
    async signAudioUrl() {
      calls.sign += 1;
      return {
        audioUrl: "https://signed-url.example/audio.mp3",
        expiresAt: "2026-07-26T13:00:00.000Z"
      };
    },
    async narrateStory() {
      calls.ml += 1;
      return {
        audio_base64: Buffer.from("audio").toString("base64"),
        mime_type: "audio/mpeg",
        duration: 1,
        words
      };
    },
    async uploadAudio() {
      calls.upload += 1;
    },
    async saveNarration(input) {
      calls.save += 1;
      return {
        id: "50000000-0000-4000-8000-000000000002",
        ...input
      };
    },
    async listObsoleteNarrations() {
      return [];
    },
    async deleteNarrations() {},
    async removeAudioObjects() {
      calls.remove += 1;
    },
    logger: console,
    ...overrides
  };

  return { deps, calls };
}

const publicPayload = {
  data: {
    storyId: story.id,
    audioUrl: "https://signed-url.example/audio.mp3",
    mimeType: "audio/mpeg",
    duration: 1,
    words,
    expiresAt: "2026-07-26T13:00:00.000Z"
  }
};

assert.equal(storyNarrationResponseSchema.parse(publicPayload).data.words[0].end, 0.28);
assert.equal(
  storyNarrationResponseSchema.safeParse({
    data: {
      ...publicPayload.data,
      words: [{ word: "The", start: 0, end: null }]
    }
  }).success,
  false,
  "story narration must reject null word end values"
);

async function main() {
  {
    const { deps, calls } = makeDeps({
      async findCachedNarration() {
        return cachedRecord;
      }
    });

    const result = await getOrCreateStoryNarrationForStory({ story, config, deps });

    assert.equal(result.audioUrl, "https://signed-url.example/audio.mp3");
    assert.equal(calls.ml, 0, "cache hit should not call ML");
    assert.equal(calls.upload, 0, "cache hit should not upload audio");
  }

  {
    const { deps, calls } = makeDeps();
    const result = await getOrCreateStoryNarrationForStory({ story, config, deps });

    assert.equal(result.storyId, story.id);
    assert.equal(calls.ml, 1, "cache miss should call ML once");
    assert.equal(calls.upload, 1, "cache miss should upload generated audio");
    assert.equal(calls.save, 1, "cache miss should save narration metadata");
    assert.equal(calls.sign, 1, "cache miss should return a signed URL");
  }

  {
    const { deps, calls } = makeDeps({
      async uploadAudio() {
        calls.upload += 1;
        throw new Error("storage failed");
      }
    });

    await assert.rejects(
      () => getOrCreateStoryNarrationForStory({ story, config, deps }),
      /storage failed/
    );
    assert.equal(calls.save, 0, "storage failure must not save misleading metadata");
  }

  {
    const { deps, calls } = makeDeps({
      async narrateStory() {
        calls.ml += 1;
        return {
          audio_base64: Buffer.from("audio").toString("base64"),
          mime_type: "audio/mpeg",
          duration: 1,
          words: [{ word: "The", start: 0, end: null }]
        } as never;
      }
    });

    await assert.rejects(
      () => getOrCreateStoryNarrationForStory({ story, config, deps }),
      /malformed response/i
    );
    assert.equal(calls.upload, 0, "invalid ML response must not upload audio");
    assert.equal(calls.save, 0, "invalid ML response must not save metadata");
  }

  console.log("story narration pipeline tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
