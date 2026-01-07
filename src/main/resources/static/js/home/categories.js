(function (app) {
  const { CATEGORY_API_URL } = app.constants;
  const state = app.state;
  const {
    categorySelects,
    categoryFeedback,
    categoryChipList,
    categoryForm,
  } = app.dom;

  function renderCategoryOptions(categories) {
    categorySelects.forEach((select) => {
      if (!select) {
        return;
      }
      const previousValue = select.value;
      select.innerHTML = "";
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
      });
      if (categories.includes(previousValue)) {
        select.value = previousValue;
      } else if (categories.length > 0) {
        select.value = categories[0];
      }
    });
    renderCategoryChips(categories);
  }

  function renderCategoryChips(categories) {
    if (!categoryChipList) {
      return;
    }
    categoryChipList.innerHTML = "";

    if (!Array.isArray(categories) || categories.length === 0) {
      const emptyChip = document.createElement("span");
      emptyChip.className =
        "inline-flex items-center rounded-full border border-white/50 bg-white/40 px-3 py-1 text-xs font-medium text-pink-700";
      emptyChip.textContent = "Fără categorii personalizate";
      categoryChipList.appendChild(emptyChip);
      return;
    }

    categories.forEach((category) => {
      const chip = document.createElement("span");
      chip.className =
        "inline-flex items-center rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium text-pink-800 shadow";
      chip.textContent = category;
      categoryChipList.appendChild(chip);
    });
  }

  function showCategoryFeedback(message, isSuccess) {
    if (!categoryFeedback) {
      return;
    }
    if (!message) {
      categoryFeedback.textContent = "";
      categoryFeedback.className = "text-sm mt-2";
      return;
    }
    categoryFeedback.textContent = message;
    categoryFeedback.className = isSuccess
      ? "text-sm mt-2 text-green-500"
      : "text-sm mt-2 text-red-500";
  }

  function resetCategorySelection(select) {
    if (select && state.cachedCategories.length > 0) {
      const matching = state.cachedCategories.find(
        (category) => category === select.value
      );
      if (!matching) {
        select.value = state.cachedCategories[0];
      }
    }
  }

  async function loadCategories() {
    try {
      const response = await fetch(CATEGORY_API_URL);
      if (!response.ok) {
        throw new Error("Nu s-au putut încărca categoriile.");
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        state.cachedCategories = data;
        renderCategoryOptions(state.cachedCategories);
        showCategoryFeedback("", true);
      } else {
        showCategoryFeedback("", true);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      showCategoryFeedback("Nu s-au putut încărca categoriile.", false);
    }
  }

  function handleCategorySubmit(event) {
    event.preventDefault();
    const input = document.getElementById("newCategoryName");
    const name = input ? input.value.trim() : "";

    if (!name) {
      showCategoryFeedback("Introduceți un nume valid.", false);
      return;
    }

    fetch(CATEGORY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then(async (response) => {
        let data = null;
        try {
          data = await response.json();
        } catch (parseError) {
          data = null;
        }

        if (response.ok && Array.isArray(data)) {
          state.cachedCategories = data;
          renderCategoryOptions(state.cachedCategories);
          showCategoryFeedback("Categorie adăugată.", true);
          if (input) {
            input.value = "";
          }
          const primarySelect = categorySelects[0];
          if (primarySelect) {
            const match = state.cachedCategories.find(
              (category) => category.toLowerCase() === name.toLowerCase()
            );
            if (match) {
              primarySelect.value = match;
            }
          }
        } else {
          const message =
            (data &&
              (data.message || data.error || data.status || data.detail)) ||
            "Categoria există deja.";
          showCategoryFeedback(message, false);
        }
      })
      .catch((error) => {
        console.error("Error adding category:", error);
        showCategoryFeedback("Nu s-a putut adăuga categoria.", false);
      });
  }

  function init() {
    if (categoryForm) {
      categoryForm.addEventListener("submit", handleCategorySubmit);
    }
  }

  app.categories = {
    renderCategoryOptions,
    renderCategoryChips,
    showCategoryFeedback,
    resetCategorySelection,
    loadCategories,
    init,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
