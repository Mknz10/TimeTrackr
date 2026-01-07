(function (app) {
  const { CATEGORY_API_URL, PERSONAL_CATEGORY_API_URL } = app.constants;
  const state = app.state;
  const {
    categorySelects,
    categoryFeedback,
    categoryChipList,
    categoryForm,
    categoryToggleBtn,
    categoryFormContainer,
  } = app.dom;
  let feedbackTimeoutId = null;
  let isFormVisible = false;

  function isWorkspaceMode() {
    return state.context === "workspace";
  }

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

  function renderCategorySection(title, categories, canDelete, emptyMessage) {
    const section = document.createElement("div");
    section.className = "space-y-2";

    const heading = document.createElement("p");
    heading.className =
      "text-xs font-semibold uppercase tracking-wide text-pink-600/80";
    heading.textContent = title;
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "flex flex-wrap gap-2";

    if (!categories.length) {
      const emptyChip = document.createElement("span");
      emptyChip.className =
        "inline-flex items-center rounded-full border border-pink-200 bg-white/60 px-3 py-1 text-xs font-medium text-pink-700";
      emptyChip.textContent = emptyMessage;
      list.appendChild(emptyChip);
    } else {
      categories.forEach((category) => {
        const chip = document.createElement("div");
        chip.className =
          "flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-3 py-1 text-xs font-medium text-pink-800 shadow-sm";

        const label = document.createElement("span");
        label.textContent = category;
        chip.appendChild(label);

        if (canDelete) {
          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.className =
            "rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-500 transition hover:bg-red-500 hover:text-white";
          deleteBtn.textContent = "Șterge";
          deleteBtn.addEventListener("click", () =>
            handleCategoryDelete(category)
          );
          chip.appendChild(deleteBtn);
        }

        list.appendChild(chip);
      });
    }

    section.appendChild(list);
    return section;
  }

  function renderCategoryChips(categories) {
    if (!categoryChipList) {
      return;
    }
    categoryChipList.innerHTML = "";

    categoryChipList.appendChild(
      renderCategorySection(
        "Categorii disponibile",
        categories,
        true,
        "Fără categorii disponibile"
      )
    );
  }

  function showCategoryFeedback(message, isSuccess) {
    if (!categoryFeedback) {
      return;
    }
    if (feedbackTimeoutId) {
      clearTimeout(feedbackTimeoutId);
      feedbackTimeoutId = null;
    }
    if (!message) {
      categoryFeedback.textContent = "";
      categoryFeedback.className = "mt-2 text-sm";
      return;
    }
    categoryFeedback.textContent = message;
    categoryFeedback.className = isSuccess
      ? "mt-2 text-sm text-green-500"
      : "mt-2 text-sm text-red-500";

    feedbackTimeoutId = setTimeout(() => {
      if (!categoryFeedback) {
        return;
      }
      categoryFeedback.textContent = "";
      categoryFeedback.className = "mt-2 text-sm";
      feedbackTimeoutId = null;
    }, 2000);
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

  function getWorkspaceId() {
    if (
      !app.workspaces ||
      typeof app.workspaces.getCurrentWorkspaceId !== "function"
    ) {
      return null;
    }
    return app.workspaces.getCurrentWorkspaceId();
  }

  async function loadCategories() {
    try {
      let response = null;
      if (isWorkspaceMode()) {
        const workspaceId = getWorkspaceId();
        if (!workspaceId) {
          showCategoryFeedback("Selectați un workspace activ.", false);
          return;
        }
        response = await fetch(
          `${CATEGORY_API_URL}?workspaceId=${encodeURIComponent(workspaceId)}`
        );
      } else {
        response = await fetch(PERSONAL_CATEGORY_API_URL);
      }
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

  async function handleCategoryDelete(category) {
    const confirmation = window.confirm(
      `Sigur ștergeți categoria "${category}"?`
    );
    if (!confirmation) {
      return;
    }

    try {
      let response = null;
      if (isWorkspaceMode()) {
        const workspaceId = getWorkspaceId();
        if (!workspaceId) {
          showCategoryFeedback("Selectați un workspace activ.", false);
          return;
        }
        response = await fetch(
          `${CATEGORY_API_URL}?name=${encodeURIComponent(
            category
          )}&workspaceId=${encodeURIComponent(workspaceId)}`,
          { method: "DELETE" }
        );
      } else {
        response = await fetch(
          `${PERSONAL_CATEGORY_API_URL}?name=${encodeURIComponent(category)}`,
          { method: "DELETE" }
        );
      }
      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        data = null;
      }

      if (response.ok && Array.isArray(data)) {
        state.cachedCategories = data;
        renderCategoryOptions(state.cachedCategories);
        showCategoryFeedback("Categorie eliminată.", true);
        categorySelects.forEach(resetCategorySelection);
      } else {
        const message =
          (data &&
            (data.message || data.error || data.status || data.detail)) ||
          "Categoria nu a putut fi ștearsă.";
        showCategoryFeedback(message, false);
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      showCategoryFeedback("Nu s-a putut șterge categoria.", false);
    }
  }

  function showCategoryForm(visible) {
    isFormVisible = visible;
    if (categoryFormContainer) {
      categoryFormContainer.classList.toggle("hidden", !visible);
    }
    if (categoryToggleBtn) {
      categoryToggleBtn.textContent = visible ? "Închide" : "Adaugă";
      categoryToggleBtn.setAttribute(
        "aria-expanded",
        visible ? "true" : "false"
      );
    }
    if (visible) {
      const input = document.getElementById("newCategoryName");
      if (input) {
        input.focus();
      }
    }
  }

  function toggleCategoryForm() {
    showCategoryForm(!isFormVisible);
  }

  function handleCategorySubmit(event) {
    event.preventDefault();
    const input = document.getElementById("newCategoryName");
    const name = input ? input.value.trim() : "";

    if (!name) {
      showCategoryFeedback("Introduceți un nume valid.", false);
      return;
    }

    let requestUrl = PERSONAL_CATEGORY_API_URL;
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    };

    if (isWorkspaceMode()) {
      const workspaceId = getWorkspaceId();
      if (!workspaceId) {
        showCategoryFeedback("Selectați un workspace activ.", false);
        return;
      }
      requestUrl = `${CATEGORY_API_URL}?workspaceId=${encodeURIComponent(
        workspaceId
      )}`;
    }

    fetch(requestUrl, options)
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
          showCategoryForm(false);
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
    if (categoryToggleBtn) {
      categoryToggleBtn.addEventListener("click", toggleCategoryForm);
    }
    showCategoryForm(false);
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
