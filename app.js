const $ = (id) => document.getElementById(id);

const clock = $("clock");
const dateEl = $("date");
const alarmStatus = $("alarmStatus");
const controls = $("controls");
const brightness = $("brightness");
const brightnessValue = $("brightnessValue");
const showSeconds = $("showSeconds");
const showDate = $("showDate");
const wakeStatus = $("wakeStatus");
const alarmTime = $("alarmTime");
const alarmEnabled = $("alarmEnabled");
const alarmVolume = $("alarmVolume");
const volumeValue = $("volumeValue");
const stopAlarmButton = $("stopAlarm");

let wakeLock = null;
let audioContext = null;
let oscillator = null;
let gainNode = null;
let alarmTimer = null;
let lastAlarmKey = "";

const defaults = {
  brightness: 20,
  showSeconds: false,
  showDate: true,
  alarmTime: "07:00",
  alarmEnabled: false,
  alarmVolume: 60
};

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem("natUrSettingsV21") || "{}");
  const settings = { ...defaults, ...saved };

  brightness.value = settings.brightness;
  showSeconds.checked = settings.showSeconds;
  showDate.checked = settings.showDate;
  alarmTime.value = settings.alarmTime;
  alarmEnabled.checked = settings.alarmEnabled;
  alarmVolume.value = settings.alarmVolume;
  applySettings();
}

function saveSettings() {
  localStorage.setItem("natUrSettingsV21", JSON.stringify({
    brightness: Number(brightness.value),
    showSeconds: showSeconds.checked,
    showDate: showDate.checked,
    alarmTime: alarmTime.value,
    alarmEnabled: alarmEnabled.checked,
    alarmVolume: Number(alarmVolume.value)
  }));
  applySettings();
}

function applySettings() {
  const level = Number(brightness.value);
  document.documentElement.style.setProperty("--clock-opacity", Math.max(.05, level / 100));
  brightnessValue.value = `${level} %`;
  volumeValue.value = `${alarmVolume.value} %`;
  dateEl.hidden = !showDate.checked;

  alarmStatus.textContent = alarmEnabled.checked && alarmTime.value
    ? `Alarm ${alarmTime.value}`
    : "";

  requestWakeLock();
}

function updateClock() {
  const now = new Date();
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds.checked ? "2-digit" : undefined,
    hour12: false
  };

  clock.textContent = now.toLocaleTimeString("da-DK", options);

  dateEl.textContent = now.toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  checkAlarm(now);
}

function checkAlarm(now) {
  if (!alarmEnabled.checked || !alarmTime.value || document.body.classList.contains("alarming")) return;

  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const alarmKey = `${now.toDateString()}-${current}`;

  if (current === alarmTime.value && lastAlarmKey !== alarmKey) {
    lastAlarmKey = alarmKey;
    startAlarm();
  }
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) {
    wakeStatus.textContent = "Ikke understøttet";
    wakeStatus.classList.add("failed");
    return;
  }

  if (wakeLock) {
    wakeStatus.textContent = "Aktiv";
    wakeStatus.classList.remove("failed");
    return;
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeStatus.textContent = "Aktiv";
    wakeStatus.classList.remove("failed");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
      wakeStatus.textContent = "Genstarter…";
      if (document.visibilityState === "visible") requestWakeLock();
    });
  } catch (_) {
    wakeStatus.textContent = "Tryk på skærmen";
    wakeStatus.classList.add("failed");
  }
}

async function releaseWakeLock() {
  if (!wakeLock) return;
  try { await wakeLock.release(); } catch (_) {}
  wakeLock = null;
}

function startAlarm() {
  stopAlarm();

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  oscillator = audioContext.createOscillator();
  gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 740;
  gainNode.gain.value = Number(alarmVolume.value) / 100 * 0.22;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();

  let high = false;
  alarmTimer = setInterval(() => {
    high = !high;
    oscillator.frequency.setValueAtTime(high ? 920 : 740, audioContext.currentTime);
  }, 500);

  document.body.classList.add("alarming");
  stopAlarmButton.hidden = false;

  if (navigator.vibrate) navigator.vibrate([500, 300, 500, 300, 1000]);
}

function stopAlarm() {
  if (alarmTimer) clearInterval(alarmTimer);
  alarmTimer = null;

  try { oscillator?.stop(); } catch (_) {}
  try { audioContext?.close(); } catch (_) {}

  oscillator = null;
  gainNode = null;
  audioContext = null;

  document.body.classList.remove("alarming");
  stopAlarmButton.hidden = true;
  if (navigator.vibrate) navigator.vibrate(0);
}

$("openControls").addEventListener("click", () => controls.hidden = false);
$("closeControls").addEventListener("click", () => controls.hidden = true);
controls.addEventListener("click", (event) => {
  if (event.target === controls) controls.hidden = true;
});

[
  brightness, showSeconds, showDate,
  alarmTime, alarmEnabled, alarmVolume
].forEach(el => el.addEventListener("input", saveSettings));

$("testAlarm").addEventListener("click", startAlarm);
stopAlarmButton.addEventListener("click", stopAlarm);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") requestWakeLock();
});

["click", "touchstart", "pointerdown"].forEach(eventName => {
  document.addEventListener(eventName, requestWakeLock, { passive: true });
});

document.addEventListener("click", () => {
  if (audioContext?.state === "suspended") audioContext.resume();
}, { passive: true });

if ("serviceWorker" in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", {
        updateViaCache: "none"
      });

      await registration.update();

      setInterval(() => registration.update(), 30 * 60 * 1000);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update();
      });
    } catch (error) {
      console.warn("Service worker kunne ikke opdateres:", error);
    }
  });
}

loadSettings();
updateClock();
setInterval(updateClock, 250);
