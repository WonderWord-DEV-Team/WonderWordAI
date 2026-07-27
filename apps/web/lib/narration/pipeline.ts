import { createHash } from "node:crypto";
import {
  DEFAULT_STORY_NARRATION_BUCKET,
  DEFAULT_STORY_NARRATION_SIGNED_URL_TTL_SECONDS,
  getNarrationFileExtension,
  isSupportedNarrationMimeType,
  MAX_STORY_NARRATION_TEXT_LENGTH,
  STORY_NARRATION_ALIGNMENT_VERSION,
  mlNarrationResponseSchema,
  storyNarrationDataSchema,
  storyNarrationWordsSchema,
  type MlNarrationResponse,
  type StoryNarration,
  type StoryNarrationErrorCode,
  type SupportedNarrationMimeType
} from "./schema";

export class StoryNarrationPipelineError extends Error {
  code: StoryNarrationErrorCode;
  status: number;

  constructor(code: StoryNarrationErrorCode, message: string, status: number) {
    super(message);
    this.name = "StoryNarrationPipelineError";
    this.code = code;
    this.status = status;
  }
}

export type GeneratedStoryForNarration = {
  id: string;
  childId: string;
  storyText: string;
};

export type StoryNarrationRecord = {
  id?: string;
  story_id: string;
  audio_path: string;
  mime_type: string;
  duration_seconds: number;
  word_timestamps: unknown;
  text_hash: string;
  narration_version: string;
};

export type StoryNarrationConfig = {
  bucket: string;
  signedUrlTtlSeconds: number;
  provider: string;
  voice: string;
  model: string;
  speakingRate: string;
  alignmentVersion: string;
};

export type SignedAudioUrl = {
  audioUrl: string;
  expiresAt: string;
};

export type StoryNarrationPipelineDeps = {
  findCachedNarration: (input: {
    storyId: string;
    narrationVersion: string;
  }) => Promise<StoryNarrationRecord | null>;
  signAudioUrl: (input: {
    bucket: string;
    audioPath: string;
    ttlSeconds: number;
  }) => Promise<SignedAudioUrl>;
  narrateStory: (input: { storyId: string; text: string }) => Promise<MlNarrationResponse>;
  uploadAudio: (input: {
    bucket: string;
    audioPath: string;
    bytes: Buffer;
    mimeType: SupportedNarrationMimeType;
  }) => Promise<void>;
  saveNarration: (input: StoryNarrationRecord) => Promise<StoryNarrationRecord>;
  listObsoleteNarrations: (input: {
    storyId: string;
    keepNarrationVersion: string;
  }) => Promise<StoryNarrationRecord[]>;
  deleteNarrations: (input: { ids: string[] }) => Promise<void>;
  removeAudioObjects: (input: { bucket: string; paths: string[] }) => Promise<void>;
  logger?: Pick<Console, "error" | "warn" | "log">;
};

export function getStoryNarrationConfigFromEnv(): StoryNarrationConfig {
  return {
    bucket: process.env.STORY_NARRATION_BUCKET || DEFAULT_STORY_NARRATION_BUCKET,
    signedUrlTtlSeconds: getPositiveIntegerEnv(
      "STORY_NARRATION_SIGNED_URL_TTL_SECONDS",
      DEFAULT_STORY_NARRATION_SIGNED_URL_TTL_SECONDS
    ),
    provider: process.env.TTS_PROVIDER || "unconfigured",
    voice: process.env.TTS_VOICE || "default",
    model: process.env.TTS_MODEL || "default",
    speakingRate: process.env.TTS_SPEAKING_RATE || "1.0",
    alignmentVersion: STORY_NARRATION_ALIGNMENT_VERSION
  };
}

export function buildNarrationVersion({
  storyText,
  config
}: {
  storyText: string;
  config: StoryNarrationConfig;
}) {
  return sha256(
    JSON.stringify({
      textHash: hashStoryText(storyText),
      provider: config.provider,
      voice: config.voice,
      model: config.model,
      speakingRate: config.speakingRate,
      alignmentVersion: config.alignmentVersion
    })
  );
}

export function hashStoryText(storyText: string) {
  return sha256(storyText);
}

export function validateStoryTextForNarration(storyText: string) {
  const trimmed = storyText.trim();

  if (!trimmed) {
    throw new StoryNarrationPipelineError(
      "validation_error",
      "Story text is empty.",
      400
    );
  }

  if (trimmed.length > MAX_STORY_NARRATION_TEXT_LENGTH) {
    throw new StoryNarrationPipelineError(
      "validation_error",
      "Story text is too long for narration.",
      413
    );
  }

  return trimmed;
}

export async function getOrCreateStoryNarrationForStory({
  story,
  config,
  deps
}: {
  story: GeneratedStoryForNarration;
  config: StoryNarrationConfig;
  deps: StoryNarrationPipelineDeps;
}): Promise<StoryNarration> {
  const storyText = validateStoryTextForNarration(story.storyText);
  const textHash = hashStoryText(storyText);
  const narrationVersion = buildNarrationVersion({ storyText, config });

  const cached = await deps.findCachedNarration({
    storyId: story.id,
    narrationVersion
  });

  if (cached && cached.text_hash === textHash) {
    const cachedPayload = await tryBuildResponseFromRecord({
      storyId: story.id,
      record: cached,
      config,
      deps
    });

    if (cachedPayload) {
      return cachedPayload;
    }
  }

  const rawMlResponse = await deps.narrateStory({
    storyId: story.id,
    text: storyText
  });
  const parsedMlResponse = mlNarrationResponseSchema.safeParse(rawMlResponse);

  if (!parsedMlResponse.success) {
    throw new StoryNarrationPipelineError(
      "malformed_narration_response",
      "Narration service returned a malformed response.",
      502
    );
  }

  const mlResponse = parsedMlResponse.data;

  const mimeType = mlResponse.mime_type.trim().toLowerCase();

  if (!isSupportedNarrationMimeType(mimeType)) {
    throw new StoryNarrationPipelineError(
      "malformed_narration_response",
      "Narration audio format is not supported.",
      502
    );
  }

  const audioBytes = decodeBase64Audio(mlResponse.audio_base64);
  const audioPath = `${story.childId}/${story.id}/${narrationVersion}.${getNarrationFileExtension(mimeType)}`;

  await deps.uploadAudio({
    bucket: config.bucket,
    audioPath,
    bytes: audioBytes,
    mimeType
  });

  let savedRecord: StoryNarrationRecord;

  try {
    savedRecord = await deps.saveNarration({
      story_id: story.id,
      audio_path: audioPath,
      mime_type: mimeType,
      duration_seconds: mlResponse.duration,
      word_timestamps: mlResponse.words,
      text_hash: textHash,
      narration_version: narrationVersion
    });
  } catch (error) {
    await deps.removeAudioObjects({ bucket: config.bucket, paths: [audioPath] }).catch((cleanupError) => {
      deps.logger?.warn("Failed to remove uploaded narration audio after metadata save failure.", {
        storyId: story.id,
        message: cleanupError instanceof Error ? cleanupError.message : "Unknown cleanup failure"
      });
    });

    throw error;
  }

  const response = await buildResponseFromRecord({
    storyId: story.id,
    record: savedRecord,
    config,
    deps
  });

  await cleanupObsoleteNarrations({
    storyId: story.id,
    keepNarrationVersion: narrationVersion,
    config,
    deps
  }).catch((error) => {
    deps.logger?.warn("Failed to clean up obsolete story narrations.", {
      storyId: story.id,
      message: error instanceof Error ? error.message : "Unknown cleanup failure"
    });
  });

  return response;
}

async function tryBuildResponseFromRecord({
  storyId,
  record,
  config,
  deps
}: {
  storyId: string;
  record: StoryNarrationRecord;
  config: StoryNarrationConfig;
  deps: StoryNarrationPipelineDeps;
}) {
  try {
    return await buildResponseFromRecord({ storyId, record, config, deps });
  } catch (error) {
    deps.logger?.warn("Cached narration could not be signed or validated; regenerating.", {
      storyId,
      narrationVersion: record.narration_version,
      message: error instanceof Error ? error.message : "Unknown cache failure"
    });

    return null;
  }
}

async function buildResponseFromRecord({
  storyId,
  record,
  config,
  deps
}: {
  storyId: string;
  record: StoryNarrationRecord;
  config: StoryNarrationConfig;
  deps: StoryNarrationPipelineDeps;
}) {
  const parsedWords = storyNarrationWordsSchema.safeParse(record.word_timestamps);

  if (!parsedWords.success) {
    throw new StoryNarrationPipelineError(
      "malformed_narration_response",
      "Stored narration timestamps are invalid.",
      502
    );
  }

  const signedUrl = await deps.signAudioUrl({
    bucket: config.bucket,
    audioPath: record.audio_path,
    ttlSeconds: config.signedUrlTtlSeconds
  });

  const payload = {
    storyId,
    audioUrl: signedUrl.audioUrl,
    mimeType: record.mime_type,
    duration: record.duration_seconds,
    words: parsedWords.data,
    expiresAt: signedUrl.expiresAt
  };

  return storyNarrationDataSchema.parse(payload);
}

async function cleanupObsoleteNarrations({
  storyId,
  keepNarrationVersion,
  config,
  deps
}: {
  storyId: string;
  keepNarrationVersion: string;
  config: StoryNarrationConfig;
  deps: StoryNarrationPipelineDeps;
}) {
  const obsolete = await deps.listObsoleteNarrations({
    storyId,
    keepNarrationVersion
  });

  if (obsolete.length === 0) {
    return;
  }

  const paths = obsolete.map((record) => record.audio_path).filter(Boolean);
  const ids = obsolete.map((record) => record.id).filter((id): id is string => Boolean(id));

  if (paths.length > 0) {
    await deps.removeAudioObjects({ bucket: config.bucket, paths });
  }

  if (ids.length > 0) {
    await deps.deleteNarrations({ ids });
  }
}

function decodeBase64Audio(value: string) {
  let bytes: Buffer;

  try {
    bytes = Buffer.from(value, "base64");
  } catch {
    throw new StoryNarrationPipelineError(
      "malformed_narration_response",
      "Narration audio was not valid base64.",
      502
    );
  }

  if (bytes.length === 0 || bytes.toString("base64").replace(/=+$/, "") !== value.replace(/\s/g, "").replace(/=+$/, "")) {
    throw new StoryNarrationPipelineError(
      "malformed_narration_response",
      "Narration audio was not valid base64.",
      502
    );
  }

  return bytes;
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
