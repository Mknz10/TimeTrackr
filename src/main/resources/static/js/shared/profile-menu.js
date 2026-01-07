(function () {
  function closeMenu(trigger, dropdown) {
    if (!dropdown.classList.contains("hidden")) {
      dropdown.classList.add("hidden");
      trigger.setAttribute("aria-expanded", "false");
    }
  }

  function openMenu(trigger, dropdown) {
    dropdown.classList.remove("hidden");
    trigger.setAttribute("aria-expanded", "true");
  }

  function findMenus() {
    return Array.from(document.querySelectorAll("[data-profile-menu]"));
  }

  function isClickInside(menuElement, eventTarget) {
    return menuElement.contains(eventTarget);
  }

  function initMenu(menuElement) {
    const trigger = menuElement.querySelector("[data-profile-trigger]");
    const dropdown = menuElement.querySelector("[data-profile-dropdown]");

    if (!trigger || !dropdown) {
      return;
    }

    let isOpen = false;

    function toggle(event) {
      event.preventDefault();
      event.stopPropagation();

      if (isOpen) {
        closeMenu(trigger, dropdown);
        isOpen = false;
        return;
      }

      findMenus().forEach((menu) => {
        if (menu === menuElement) {
          return;
        }
        const otherTrigger = menu.querySelector("[data-profile-trigger]");
        const otherDropdown = menu.querySelector("[data-profile-dropdown]");
        if (otherTrigger && otherDropdown) {
          closeMenu(otherTrigger, otherDropdown);
        }
      });

      openMenu(trigger, dropdown);
      isOpen = true;
    }

    function handleOutsideClick(event) {
      if (!isClickInside(menuElement, event.target)) {
        closeMenu(trigger, dropdown);
        isOpen = false;
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeMenu(trigger, dropdown);
        isOpen = false;
      }
    }

    trigger.addEventListener("click", toggle);
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
  }

  function init() {
    findMenus().forEach(initMenu);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
