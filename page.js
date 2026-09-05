let isConverting = false;
let convertedInput = "";

function setStatus(message, type) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = "status " + type;
}

function setBusy(busy) {
  isConverting = busy;
  document.getElementById("convertOpenButton").disabled = busy;
  document.getElementById("convertButton").disabled = busy;
  document.getElementById("alternativeSelect").disabled = busy;
  document.getElementById("copyButton").disabled = busy;
  document.getElementById("inputUrl").readOnly = busy;
  document.getElementById("status").setAttribute("aria-busy", String(busy));
}

function showWarnings(warnings) {
  const list = document.getElementById("warningList");
  list.replaceChildren();
  for (const warning of warnings) {
    const item = document.createElement("li");
    item.textContent = warning;
    list.appendChild(item);
  }
  document.getElementById("warningsPanel").hidden = warnings.length === 0;
}

function showAlternatives(alternatives, selectedAlternative) {
  const select = document.getElementById("alternativeSelect");
  select.replaceChildren();
  for (const alternative of alternatives) {
    const option = document.createElement("option");
    option.value = String(alternative.index);
    option.textContent = alternative.label;
    select.appendChild(option);
  }
  select.value = String(selectedAlternative);
  document.getElementById("alternativesPanel").hidden = alternatives.length === 0;
}

function currentAlternativeIndex() {
  const input = document.getElementById("inputUrl").value.trim();
  return input === convertedInput
    ? Number(document.getElementById("alternativeSelect").value || 0)
    : 0;
}

async function convertOnly(alternativeIndex = currentAlternativeIndex()) {
  if (isConverting) return null;

  const input = document.getElementById("inputUrl").value.trim();
  const output = document.getElementById("outputUrl");
  output.value = "";
  showWarnings([]);

  if (!input) {
    showAlternatives([], 0);
    setStatus("Please paste a Penpa solve link first.", "error");
    return null;
  }

  setBusy(true);
  try {
    setStatus("Converting...", "success");
    const result = await convertPenpaUrlDetailed(input, { alternativeIndex });

    output.value = result.url;
    convertedInput = input;
    showWarnings(result.warnings);
    showAlternatives(result.alternatives, result.selectedAlternative);
    setStatus(
      result.warnings.length > 0
        ? "Converted. Please review the conversion notes below."
        : "Converted successfully.",
      "success"
    );
    return result.url;
  } catch (err) {
    showAlternatives([], 0);
    setStatus("Error: " + (err.message || String(err)), "error");
    return null;
  } finally {
    setBusy(false);
  }
}

async function convertAndOpen() {
  if (isConverting) return;

  // Open within the click event, before asynchronous URL resolution begins.
  let openedWindow = null;
  if (document.getElementById("inputUrl").value.trim()) {
    try {
      openedWindow = window.open("about:blank", "_blank");
      if (openedWindow) openedWindow.opener = null;
    } catch (err) {
      openedWindow = null;
    }
  }

  const result = await convertOnly();
  if (!result) {
    if (openedWindow && !openedWindow.closed) openedWindow.close();
    return;
  }

  if (openedWindow && !openedWindow.closed) {
    try {
      openedWindow.location.replace(result);
      return;
    } catch (err) {
      openedWindow.close();
    }
  }
  setStatus(
    "Converted. Your browser could not open the new tab. Copy the generated URL to open it manually, and review any conversion notes below.",
    "success"
  );
}

async function copyOutput() {
  const output = document.getElementById("outputUrl").value.trim();

  if (!output) {
    setStatus("No output link to copy.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(output);
    setStatus("Output URL copied to clipboard.", "success");
  } catch (err) {
    setStatus("Could not copy automatically. Please copy it manually.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("convertOpenButton").addEventListener("click", convertAndOpen);
  document.getElementById("convertButton").addEventListener("click", () => convertOnly());
  document.getElementById("copyButton").addEventListener("click", copyOutput);
  document.getElementById("alternativeSelect").addEventListener("change", (event) => {
    convertOnly(Number(event.target.value));
  });
  document.getElementById("inputUrl").addEventListener("input", () => {
    convertedInput = "";
    document.getElementById("outputUrl").value = "";
    showWarnings([]);
    showAlternatives([], 0);
    setStatus("", "");
  });
});
