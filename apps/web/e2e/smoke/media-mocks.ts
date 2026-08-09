import type { Page } from "@playwright/test";

export async function installGrantedMediaMocks(page: Page) {
  await page.addInitScript(() => {
    window.__wonderwordE2eMedia = true;
    window.localStorage.setItem("__wonderwordE2eMedia", "1");

    const makeTrack = () => ({
      stop() {
        return undefined;
      }
    });

    const fakeStream = {
      getTracks() {
        return [makeTrack()];
      }
    };

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        async getUserMedia() {
          return fakeStream;
        }
      }
    });

    type MutableRecorder = {
      mimeType: string;
      state: RecordingState;
      ondataavailable: ((event: BlobEvent) => void) | null;
      onerror: ((event: Event) => void) | null;
      onstop: ((event: Event) => void) | null;
    };

    function FakeMediaRecorder(this: MutableRecorder, _stream: MediaStream, options?: MediaRecorderOptions) {
      this.mimeType = options?.mimeType ?? "audio/webm";
      this.state = "inactive";
      this.ondataavailable = null;
      this.onerror = null;
      this.onstop = null;
    }

    FakeMediaRecorder.isTypeSupported = (type: string) =>
      type === "audio/webm" || type === "audio/mp4" || type === "audio/wav";

    FakeMediaRecorder.prototype.start = function start(this: MutableRecorder) {
      this.state = "recording";
      window.setTimeout(() => {
        if (this.state === "recording") {
          FakeMediaRecorder.prototype.stop.call(this);
        }
      }, 250);
    };

    FakeMediaRecorder.prototype.stop = function stop(this: MutableRecorder) {
      if (this.state !== "recording") {
        return;
      }

      this.state = "inactive";
      const data = new Blob(["synthetic child reading audio"], { type: this.mimeType });
      window.setTimeout(() => {
        this.ondataavailable?.({ data } as BlobEvent);
        this.onstop?.({} as Event);
      }, 0);
    };

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: FakeMediaRecorder as unknown as typeof MediaRecorder
    });
  });
}

export async function installDeniedMicrophoneMock(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        async getUserMedia() {
          throw new DOMException("Permission denied", "NotAllowedError");
        }
      }
    });

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: class {
        static isTypeSupported() {
          return true;
        }
      }
    });
  });
}

export async function installNoCameraMock(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined
    });
  });
}

export async function installNoMediaRecorderMock(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        async getUserMedia() {
          return {
            getTracks() {
              return [];
            }
          };
        }
      }
    });

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: undefined
    });
  });
}
