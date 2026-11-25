(() => {
  const studio = document.querySelector(".mask-studio");
  const shell = studio.querySelector(".studio-shell");
  const stage = studio.querySelector(".studio-stage");
  const picker = studio.querySelector(".studio-picker");
  const video = studio.querySelector(".studio-video");
  const canvas = studio.querySelector(".studio-render");
  const fallback = studio.querySelector(".studio-fallback");
  const title = studio.querySelector(".studio-mask-name");
  const indicator = studio.querySelector(".studio-indicator");
  const status = studio.querySelector(".studio-status");
  const button = studio.querySelector(".studio-camera");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const input = document.createElement("canvas");
  const inputContext = input.getContext("2d", { alpha: false, willReadFrequently: true });
  const idleMessage = "Your video stays on this device.";
  const centerMessage = "Center your face in the frame.";
  const canUseCamera = window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);

  let renderer;
  let trackerPromise;
  let session;
  let frame;
  let scrollFrame;
  let visible = false;
  let revealProgress = 1;
  let aiming = false;
  let aimX = 0;
  let aimY = 0;
  let yaw = -0.20;
  let pitch = 0;
  let mask = picker.querySelector(":checked").value;

  function writeStatus(message) {
    if (status.textContent !== message) status.textContent = message;
  }

  function showMode(mode, message) {
    shell.dataset.camera = mode;
    indicator.textContent = mode === "live" ? "CAMERA LIVE" : mode === "starting" ? "STARTING CAMERA" : renderer ? "3D PREVIEW" : "MASK PREVIEW";
    button.querySelector("b").textContent = mode === "live" ? "Stop camera" : mode === "starting" ? "Cancel" : "Start camera";
    if (mode !== "live") shell.removeAttribute("data-tracking");
    writeStatus(message);
  }

  function stopCamera(message = idleMessage) {
    const stopped = session;
    session = undefined;
    if (stopped) {
      clearTimeout(stopped.loadTimeout);
      stopped.stream?.getTracks().forEach((track) => track.stop());
      video.pause();
      video.srcObject = null;
      inputContext?.clearRect(0, 0, input.width, input.height);
    }
    renderer?.resetFace();
    showMode("idle", message);
    scheduleFrame();
  }

  async function createTracker() {
    let runtime;
    let model;
    if (location.protocol === "file:") {
      // Local files cannot fetch sibling modules or model bytes in Chromium.
      runtime = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/";
      model = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
    } else {
      runtime = new URL("./assets/studio/mediapipe/", document.baseURI).href;
      model = `${runtime}face_landmarker.task`;
    }
    const { FaceLandmarker, FilesetResolver } = await import(`${runtime}vision_bundle.mjs`);
    const files = await FilesetResolver.forVisionTasks(`${runtime}wasm`);
    return FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: model, delegate: "CPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    });
  }

  function getTracker() {
    trackerPromise ??= createTracker().catch((error) => {
      trackerPromise = undefined;
      throw error;
    });
    return trackerPromise;
  }

  const cameraErrors = {
    NotAllowedError: "Allow camera access in your browser, then try again.",
    NotFoundError: "Connect a webcam, then try again.",
    NotReadableError: "Close other apps using the webcam, then try again.",
    AbortError: "The camera was interrupted. Try again.",
  };

  async function startCamera() {
    const request = { lastFrame: -1, lastAnalysis: -Infinity, lastFace: -Infinity, hasFace: false };
    session = request;
    showMode("starting", "Allow camera access to start the try-on.");
    const clearance = parseFloat(getComputedStyle(stage).scrollMarginBlockStart);
    if (stage.getBoundingClientRect().top < clearance) {
      stage.scrollIntoView({ block: "start", behavior: motion.matches ? "instant" : "smooth" });
    }
    let loadingTracking = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
      });
      if (session !== request) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      request.stream = stream;
      for (const track of stream.getVideoTracks()) {
        track.addEventListener("ended", () => {
          if (session === request) stopCamera("The webcam disconnected. Reconnect it and try again.");
        }, { once: true });
      }
      video.srcObject = stream;
      request.loadTimeout = setTimeout(() => {
        if (session === request) stopCamera("The try-on is taking too long to start. Try again.");
      }, 25000);
      await video.play();
      if (session !== request) return;

      loadingTracking = true;
      writeStatus("Loading face tracking…");
      const tracker = await getTracker();
      if (session !== request) return;
      clearTimeout(request.loadTimeout);
      request.tracker = tracker;
      renderer.resetFace();
      showMode("live", centerMessage);
      scheduleFrame();
    } catch (error) {
      if (session !== request) return;
      if (loadingTracking) {
        console.warn("Face tracking could not start", error);
        stopCamera("Face tracking could not load. Check your connection and try again.");
      } else {
        stopCamera(cameraErrors[error.name] ?? "The webcam could not start. Try again.");
      }
    }
  }

  function updateTracking(now, active) {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.currentTime !== active.lastFrame && now - active.lastAnalysis >= 34) {
      active.lastFrame = video.currentTime;
      active.lastAnalysis = now;
      const scale = Math.min(1, 600 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.round(video.videoWidth * scale);
      const height = Math.round(video.videoHeight * scale);
      if (input.width !== width || input.height !== height) {
        input.width = width;
        input.height = height;
      }
      inputContext.drawImage(video, 0, 0, width, height);
      const face = active.tracker.detectForVideo(input, now).faceLandmarks[0];

      if (face?.length >= studioGeometry.faceSize) {
        renderer.track(face);
        active.lastFace = now;
        if (!active.hasFace) {
          active.hasFace = true;
          shell.setAttribute("data-tracking", "");
          writeStatus("Face tracking on · Move or turn to see the fit.");
        }
      }
    }

    if (active.hasFace && now - active.lastFace > 160) {
      active.hasFace = false;
      renderer.resetFace();
      shell.removeAttribute("data-tracking");
      writeStatus(centerMessage);
    }
    if (active.hasFace) renderer.videoFrame(video);
  }

  function drawFrame(now) {
    frame = undefined;
    if (!renderer || !visible || document.hidden) return;
    if (session?.tracker) {
      try {
        updateTracking(now, session);
      } catch (error) {
        console.warn("Face tracking was interrupted", error);
        session.tracker.close();
        trackerPromise = undefined;
        stopCamera("Face tracking stopped. Start the camera to retry.");
      }
    } else if (motion.matches) {
      renderer.preview(-0.20, 0.03, 0, 1);
    } else {
      const turn = aiming ? aimX * 0.58 : -0.12 + Math.sin(now / 1540) * 0.34;
      const tilt = aiming ? aimY * 0.28 : 0.015 + Math.sin(now / 2110) * 0.055;
      yaw += (turn - yaw) * 0.105;
      pitch += (tilt - pitch) * 0.105;
      const entrance = 1 - revealProgress;
      renderer.preview(yaw - entrance * 0.55, pitch, Math.sin(now / 980) * 0.15 - entrance, 1 - entrance * 0.22);
    }
    if (session?.tracker || !motion.matches) scheduleFrame();
  }

  function scheduleFrame() {
    if (frame === undefined && visible && renderer && !document.hidden) frame = requestAnimationFrame(drawFrame);
  }

  function selectMask(radio) {
    mask = radio.value;
    const option = radio.closest("label");
    title.textContent = option.querySelector("span").textContent;
    if (!renderer) fallback.src = option.querySelector("img").src;
    renderer?.select(mask);
    scheduleFrame();
  }

  function initializeRenderer() {
    try {
      renderer = createStudioRenderer(canvas);
      renderer?.select(mask);
    } catch (error) {
      console.warn("The 3D preview is unavailable", error);
      renderer = null;
    }
    if (!renderer) fallback.src = picker.querySelector(":checked").closest("label").querySelector("img").src;
    fallback.hidden = Boolean(renderer);
    button.hidden = !renderer || !canUseCamera;
    const message = !renderer ? "This browser needs WebGL for 3D try-on." :
      !canUseCamera ? "Open this page over HTTPS or on localhost to use the camera." : idleMessage;
    showMode("idle", message);
    scheduleFrame();
  }

  function revealStudio() {
    scrollFrame = undefined;
    if (motion.matches) {
      revealProgress = 1;
      studio.style.removeProperty("--studio-heading");
      studio.style.removeProperty("--studio-reveal");
      return;
    }
    const { top } = studio.getBoundingClientRect();
    const viewport = document.documentElement.clientHeight;
    const remaining = document.documentElement.scrollHeight - viewport - scrollY;
    const start = viewport * 0.93;
    const end = Math.max(viewport * 0.19, top - remaining);
    const progress = Math.max(0, Math.min(1, (start - top) / Math.max(1, start - end)));
    const eased = 1 - (1 - progress) ** 2.35;
    const heading = Math.min(1, eased * 1.55);
    revealProgress = eased;
    studio.style.setProperty("--studio-heading", heading.toFixed(4));
    studio.style.setProperty("--studio-reveal", eased.toFixed(4));
  }

  function scheduleReveal() {
    if (scrollFrame === undefined) scrollFrame = requestAnimationFrame(revealStudio);
  }

  picker.disabled = false;
  picker.addEventListener("change", (event) => selectMask(event.target));
  button.addEventListener("click", () => {
    if (session) stopCamera();
    else startCamera();
  });
  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || motion.matches) return;
    const bounds = stage.getBoundingClientRect();
    aimX = 2 * (event.clientX - bounds.left) / bounds.width - 1;
    aimY = 2 * (event.clientY - bounds.top) / bounds.height - 1;
    aiming = true;
    scheduleFrame();
  });
  stage.addEventListener("pointerleave", () => { aiming = false; });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    renderer = null;
    fallback.src = picker.querySelector(":checked").closest("label").querySelector("img").src;
    fallback.hidden = false;
    button.hidden = true;
    stopCamera("The 3D preview was interrupted.");
  });
  canvas.addEventListener("webglcontextrestored", initializeRenderer);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    scheduleFrame();
  }).observe(stage);
  new ResizeObserver(scheduleFrame).observe(stage);
  document.addEventListener("visibilitychange", scheduleFrame);
  window.addEventListener("scroll", scheduleReveal, { passive: true });
  window.addEventListener("resize", scheduleReveal);
  window.addEventListener("pageshow", scheduleReveal);
  window.addEventListener("pagehide", () => { if (session) stopCamera(); });
  motion.addEventListener("change", () => {
    scheduleReveal();
    scheduleFrame();
  });

  revealStudio();
  initializeRenderer();
})();
