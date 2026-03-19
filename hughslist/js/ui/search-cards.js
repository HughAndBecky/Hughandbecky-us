// /js/ui/search-cards.js

export function initSearchCards() {
  const zone = document.getElementById("search-zone");
  const facetInput = document.getElementById("facet-input");
  const searchInput = document.getElementById("search-input");

  const textContainer = document.getElementById("text-search-container");
  const timelineContainer = document.getElementById("timeline-container");

  const startRange = document.getElementById("timeline-start");
  const endRange = document.getElementById("timeline-end");

  const startValue = document.getElementById("timeline-start-value");
  const endValue = document.getElementById("timeline-end-value");

  const slider = document.querySelector(".dual-slider");

  if (!zone) return;


  // ------------------------------------------------------------
  // Card click → reveal search zone + switch between modes
  // ------------------------------------------------------------
  document.querySelectorAll(".card-trigger").forEach(btn => {
    btn.addEventListener("click", () => {
      const facet = btn.dataset.facet;

      zone.hidden = false;
      zone.setAttribute("aria-hidden", "false");

      facetInput.value = facet;

      if (facet === "date") {
        textContainer.hidden = true;
        timelineContainer.hidden = false;
        startRange.focus();
      } else {
        textContainer.hidden = false;
        timelineContainer.hidden = true;
        searchInput.focus();
      }
    });
  });


  // ------------------------------------------------------------
  // Dual‑handle slider logic + active range bar
  // ------------------------------------------------------------
  function updateTimeline() {
    let start = parseInt(startRange.value, 10);
    let end = parseInt(endRange.value, 10);

    // Enforce start ≤ end
    if (start > end) {
      [start, end] = [end, start];
      startRange.value = start;
      endRange.value = end;
    }

    // Update visible numbers
    startValue.textContent = start;
    endValue.textContent = end;

    // Compute percentages for active range bar
    const min = parseInt(startRange.min, 10);
    const max = parseInt(startRange.max, 10);

    const percentStart = ((start - min) / (max - min)) * 100;
    const percentEnd = ((end - min) / (max - min)) * 100;

    // Update CSS variables for the active range bar
    if (slider) {
      slider.style.setProperty("--range-start", percentStart + "%");
      slider.style.setProperty("--range-end", percentEnd + "%");
    }
  }

  if (startRange && endRange) {
    startRange.addEventListener("input", updateTimeline);
    endRange.addEventListener("input", updateTimeline);
    updateTimeline(); // initialize
  }
}
