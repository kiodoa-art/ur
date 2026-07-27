(() => {
  "use strict";

  const VERSION = "3.0.1";
  const $ = id => document.getElementById(id);

  const elements = {
    clock: $("clock"),
    seconds: $("seconds"),
    settingsButton: $("settingsButton"),
    overlay: $("settingsOverlay"),
    closeSettings: $("closeSettings"),
    brightness: $("brightness"),
    brightnessValue: $("brightnessValue"),
    showSeconds: $("showSeconds"),
    wakeDot: $("wakeDot"),
    wakeText: $("wakeText"),
    alarmTime: $("alarmTime"),
    alarmEnabled: $("alarmEnabled"),
    alarmVolume: $("alarmVolume"),
    alarmVolumeValue: $("alarmVolumeValue"),
    testAlarm: $("testAlarm"),
    stopAlarm: $("stopAlarm")
  };

  const defaults = {
    brightness: 28,
    showSeconds: false,
    alarmTime: "07:00",
    alarmEnabled: false,
    alarmVolume: 60
  };

  let wakeLock = null;
  let wakeRetry = null;
  let audioContext = null;
  let oscillator = null;
  let gainNode = null;
  let toneTimer = null;
  let lastAlarmKey = "";
  let reloading = false;

  function safeSettings() {
    try {
      return Object.assign({}, defaults, JSON.parse(localStorage.getItem("natUrSettings") || "{}"));
    } catch (error) {
      return Object.assign({}, defaults);
    }
  }

  function applySettings() {
    const value = Number(elements.brightness.value) || defaults.brightness;
    document.documentElement.style.setProperty("--clock-alpha", String(value / 100));
    elements.brightnessValue.textContent = `${value} %`;
    elements.alarmVolumeValue.textContent = `${elements.alarmVolume.value} %`;
    elements.seconds.hidden = !elements.showSeconds.checked;
  }

  function saveSettings() {
    localStorage.setItem("natUrSettings", JSON.stringify({
      brightness: Number(elements.brightness.value),
      showSeconds: elements.showSeconds.checked,
      alarmTime: elements.alarmTime.value || defaults.alarmTime,
      alarmEnabled: elements.alarmEnabled.checked,
      alarmVolume: Number(elements.alarmVolume.value)
    }));
    applySettings();
  }

  function loadSettings() {
    const s = safeSettings();
    elements.brightness.value = s.brightness;
    elements.showSeconds.checked = Boolean(s.showSeconds);
    elements.alarmTime.value = s.alarmTime || defaults.alarmTime;
    elements.alarmEnabled.checked = Boolean(s.alarmEnabled);
    elements.alarmVolume.value = s.alarmVolume;
    applySettings();
  }

  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    elements.clock.textContent = `${hh}:${mm}`;
    elements.seconds.textContent = ss;
    checkAlarm(now, `${hh}:${mm}`);
  }

  function wakeStatus(state, text) {
    elements.wakeDot.className = `status-dot ${state}`;
    elements.wakeText.textContent = text;
  }

  async function requestWakeLock() {
    clearTimeout(wakeRetry);

    if (!("wakeLock" in navigator)) {
      wakeStatus("error", "Wake Lock understøttes ikke");
      return;
    }

    if (document.visibilityState !== "visible") {
      wakeStatus("waiting", "Venter på at appen bliver aktiv");
      return;
    }

    if (wakeLock && !wakeLock.released) {
      wakeStatus("active", "Skærmen holdes vågen");
      return;
    }

    wakeStatus("waiting", "Aktiverer Wake Lock…");

    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeStatus("active", "Skærmen holdes vågen");

      wakeLock.addEventListener("release", () => {
        wakeLock = null;
        if (document.visibilityState === "visible") {
          wakeStatus("waiting", "Genaktiverer Wake Lock…");
          wakeRetry = setTimeout(requestWakeLock, 800);
        }
      }, { once: true });
    } catch (error) {
      wakeStatus("error", "Wake Lock kunne ikke aktiveres");
      wakeRetry = setTimeout(requestWakeLock, 3000);
    }
  }

  function checkAlarm(now, currentTime) {
    if (!elements.alarmEnabled.checked || !elements.alarmTime.value ||
        document.body.classList.contains("alarming")) return;

    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${currentTime}`;
    if (currentTime === elements.alarmTime.value && key !== lastAlarmKey) {
      lastAlarmKey = key;
      startAlarm();
    }
  }

  async function startAlarm() {
    stopAlarm();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      audioContext = new AudioCtx();
      await audioContext.resume();
      oscillator = audioContext.createOscillator();
      gainNode = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 760;
      gainNode.gain.value = (Number(elements.alarmVolume.value) / 100) * .24;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();

      let high = false;
      toneTimer = setInterval(() => {
        high = !high;
        if (oscillator && audioContext) {
          oscillator.frequency.setValueAtTime(high ? 940 : 760, audioContext.currentTime);
        }
      }, 480);

      document.body.classList.add("alarming");
      elements.stopAlarm.hidden = false;
      if (navigator.vibrate) navigator.vibrate([500,250,500,250,900]);
    } catch (error) {
      stopAlarm();
    }
  }

  function stopAlarm() {
    if (toneTimer) clearInterval(toneTimer);
    toneTimer = null;
    try { if (oscillator) oscillator.stop(); } catch (error) {}
    try { if (audioContext) audioContext.close(); } catch (error) {}
    oscillator = null;
    gainNode = null;
    audioContext = null;
    document.body.classList.remove("alarming");
    elements.stopAlarm.hidden = true;
    if (navigator.vibrate) navigator.vibrate(0);
  }

  function bindEvents() {
    [elements.brightness, elements.showSeconds, elements.alarmTime,
     elements.alarmEnabled, elements.alarmVolume].forEach(el => {
      el.addEventListener("input", saveSettings);
      el.addEventListener("change", saveSettings);
    });

    elements.settingsButton.addEventListener("click", () => {
      elements.overlay.hidden = false;
      requestWakeLock();
    });

    elements.closeSettings.addEventListener("click", () => {
      elements.overlay.hidden = true;
    });

    elements.overlay.addEventListener("click", event => {
      if (event.target === elements.overlay) elements.overlay.hidden = true;
    });

    elements.testAlarm.addEventListener("click", startAlarm);
    elements.stopAlarm.addEventListener("click", stopAlarm);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        updateClock();
        requestWakeLock();
        checkForUpdates();
      }
    });

    document.addEventListener("pointerdown", requestWakeLock, { passive: true });
  }

  async function checkForUpdates() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) await registration.update();
    } catch (error) {}
  }

  function installServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("./sw.js?v=3.0.1", {
          updateViaCache: "none"
        });

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloading) return;
          reloading = true;
          location.reload();
        });

        setInterval(checkForUpdates, 30 * 60 * 1000);
      } catch (error) {}
    });
  }

  loadSettings();
  updateClock();
  bindEvents();
  requestWakeLock();
  installServiceWorker();

  setInterval(updateClock, 1000);
})();
