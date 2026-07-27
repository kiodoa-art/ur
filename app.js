const VERSION = "3.0.0";
const $ = (id) => document.getElementById(id);

const clock = $("clock");
const secondsEl = $("seconds");
const settingsButton = $("settingsButton");
const settingsOverlay = $("settingsOverlay");
const closeSettings = $("closeSettings");
const clockBrightness = $("clockBrightness");
const clockBrightnessValue = $("clockBrightnessValue");
const showSeconds = $("showSeconds");
const wakeLockDot = $("wakeLockDot");
const wakeLockText = $("wakeLockText");
const alarmTime = $("alarmTime");
const alarmEnabled = $("alarmEnabled");
const alarmVolume = $("alarmVolume");
const alarmVolumeValue = $("alarmVolumeValue");
const testAlarm = $("testAlarm");
const stopAlarmButton = $("stopAlarm");

const defaults = {
  brightness: 28,
  showSeconds: false,
  alarmTime: "07:00",
  alarmEnabled: false,
  alarmVolume: 60
};

let wakeLock = null;
let wakeLockRetryTimer = null;
let audioContext = null;
let oscillator = null;
let gainNode = null;
let alarmPatternTimer = null;
let lastAlarmKey = "";
let refreshing = false;

function readSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem("natUrSettings") || "{}") };
  } catch {
    return { ...defaults };
  }
}

function writeSettings() {
  localStorage.setItem("natUrSettings", JSON.stringify({
    brightness: Number(clockBrightness.value),
    showSeconds: showSeconds.checked,
    alarmTime: alarmTime.value || defaults.alarmTime,
    alarmEnabled: alarmEnabled.checked,
    alarmVolume: Number(alarmVolume.value)
  }));

  applySettings();
}

function applySettings() {
  const brightness = Number(clockBrightness.value);
  document.documentElement.style.setProperty("--clock-opacity", String(brightness / 100));
  clockBrightnessValue.value = `${brightness} %`;
  alarmVolumeValue.value = `${alarmVolume.value} %`;
  secondsEl.hidden = !showSeconds.checked;
}

function loadSettings() {
  const settings = readSettings();
  clockBrightness.value = settings.brightness;
  showSeconds.checked = settings.showSeconds;
  alarmTime.value = settings.alarmTime;
  alarmEnabled.checked = settings.alarmEnabled;
  alarmVolume.value = settings.alarmVolume;
  applySettings();
}

function updateClock() {
  const now = new Date();

  clock.textContent = now.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  secondsEl.textContent = String(now.getSeconds()).padStart(2, "0");
  checkAlarm(now);
}

function setWakeLockStatus(state, text) {
  wakeLockDot.className = `status-dot ${state}`;
  wakeLockText.textContent = text;
}

async function requestWakeLock() {
  clearTimeout(wakeLockRetryTimer);

  if (!("wakeLock" in navigator)) {
    setWakeLockStatus("error", "Wake Lock understøttes ikke");
    return;
  }

  if (document.visibilityState !== "visible") {
    setWakeLockStatus("waiting", "Venter på at appen bliver aktiv");
    return;
  }

  if (wakeLock && !wakeLock.released) {
    setWakeLockStatus("active", "Skærmen holdes vågen");
    return;
  }

  setWakeLockStatus("waiting", "Aktiverer…");

  try {
    wakeLock = await navigator.wakeLock.request("screen");
    setWakeLockStatus("active", "Skærmen holdes vågen");

    wakeLock.addEventListener("release", () => {
      wakeLock = null;

      if (document.visibilityState === "visible") {
        setWakeLockStatus("waiting", "Genaktiverer…");
        wakeLockRetryTimer = setTimeout(requestWakeLock, 700);
      } else {
        setWakeLockStatus("waiting", "Venter på at appen bliver aktiv");
      }
    });
  } catch (error) {
    setWakeLockStatus("error", "Kunne ikke aktivere Wake Lock");
    wakeLockRetryTimer = setTimeout(requestWakeLock, 3000);
  }
}

function checkAlarm(now) {
  if (!alarmEnabled.checked || !alarmTime.value || document.body.classList.contains("alarming")) {
    return;
  }

  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const alarmKey = `${now.toDateString()}-${current}`;

  if (current === alarmTime.value && lastAlarmKey !== alarmKey) {
    lastAlarmKey = alarmKey;
    startAlarm();
  }
}

async function startAlarm() {
  stopAlarm();

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext = new AudioContextClass();
  await audioContext.resume();

  oscillator = audioContext.createOscillator();
  gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 760;
  gainNode.gain.value = (Number(alarmVolume.value) / 100) * 0.24;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();

  let high = false;
  alarmPatternTimer = setInterval(() => {
    if (!oscillator || !audioContext) return;
    high = !high;
    oscillator.frequency.setValueAtTime(high ? 940 : 760, audioContext.currentTime);
  }, 480);

  document.body.classList.add("alarming");
  stopAlarmButton.hidden = false;

  if (navigator.vibrate) {
    navigator.vibrate([500, 250, 500, 250, 900]);
  }
}

function stopAlarm() {
  if (alarmPatternTimer) clearInterval(alarmPatternTimer);
  alarmPatternTimer = null;

  try { oscillator?.stop(); } catch {}
  try { audioContext?.close(); } catch {}

  oscillator = null;
  gainNode = null;
  audioContext = null;

  document.body.classList.remove("alarming");
  stopAlarmButton.hidden = true;

  if (navigator.vibrate) navigator.vibrate(0);
}

function openSettings() {
  settingsOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function hideSettings() {
  settingsOverlay.hidden = true;
  document.body.style.overflow = "";
}

[
  clockBrightness,
  showSeconds,
  alarmTime,
  alarmEnabled,
  alarmVolume
].forEach((element) => {
  element.addEventListener("input", writeSettings);
  element.addEventListener("change", writeSettings);
});

settingsButton.addEventListener("click", openSettings);
closeSettings.addEventListener("click", hideSettings);

settingsOverlay.addEventListener("click", (event) => {
  if (event.target === settingsOverlay) hideSettings();
});

testAlarm.addEventListener("click", startAlarm);
stopAlarmButton.addEventListener("click", stopAlarm);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    requestWakeLock();
    checkForUpdates();
  }
});

document.addEventListener("pointerdown", () => {
  requestWakeLock();
  if (audioContext?.state === "suspended") audioContext.resume();
}, { passive: true });

async function checkForUpdates() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  } catch {}
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });

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
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    setInterval(checkForUpdates, 30 * 60 * 1000);
  });
}

loadSettings();
updateClock();
requestWakeLock();
setInterval(updateClock, 250);
