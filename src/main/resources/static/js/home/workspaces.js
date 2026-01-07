(function (app) {
  const { WORKSPACE_API_URL } = app.constants;
  const state = app.state;
  const dom = app.dom;

  function getCurrentWorkspaceId() {
    return state.currentWorkspaceId;
  }

  function setCurrentWorkspace(id) {
    if (!Number.isFinite(Number(id))) {
      return;
    }
    const numericId = Number(id);
    if (state.currentWorkspaceId === numericId) {
      return;
    }
    state.currentWorkspaceId = numericId;
    if (dom.workspaceSelect) {
      dom.workspaceSelect.value = String(numericId);
    }
    if (app.categories && typeof app.categories.loadCategories === "function") {
      app.categories.loadCategories();
    }
    if (app.activities && typeof app.activities.loadActivities === "function") {
      app.activities.loadActivities();
    }
  }

  async function fetchWorkspaces() {
    const response = await fetch(WORKSPACE_API_URL);
    if (!response.ok) {
      throw new Error("Cannot load workspaces");
    }
    return response.json();
  }

  function populateSelect(workspaces) {
    if (!dom.workspaceSelect) {
      return;
    }
    dom.workspaceSelect.innerHTML = "";
    workspaces.forEach((workspace) => {
      const option = document.createElement("option");
      option.value = workspace.id;
      option.textContent = `${workspace.name} (${workspace.role.toLowerCase()})`;
      dom.workspaceSelect.appendChild(option);
    });
  }

  async function loadWorkspaces() {
    try {
      const workspaces = await fetchWorkspaces();
      state.workspaces = Array.isArray(workspaces) ? workspaces : [];
      populateSelect(state.workspaces);
      if (state.workspaces.length && !state.currentWorkspaceId) {
        setCurrentWorkspace(state.workspaces[0].id);
      } else if (state.currentWorkspaceId) {
        setCurrentWorkspace(state.currentWorkspaceId);
      }
    } catch (error) {
      console.error("Error loading workspaces", error);
      state.workspaces = [];
    }
  }

  async function handleCreateWorkspace() {
    const name = prompt("Introduceți numele workspace-ului");
    if (!name) {
      return;
    }
    try {
      const response = await fetch(WORKSPACE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error("Nu s-a putut crea workspace-ul");
      }
      await loadWorkspaces();
      const created = state.workspaces.find((ws) => ws.name === name);
      if (created) {
        setCurrentWorkspace(created.id);
      }
    } catch (error) {
      alert(error.message || "Eroare la crearea workspace-ului");
    }
  }

  async function handleInviteMember() {
    if (!state.currentWorkspaceId) {
      alert("Selectați un workspace mai întâi.");
      return;
    }
    const username = prompt("Introduceți username-ul membrului");
    if (!username) {
      return;
    }
    try {
      const response = await fetch(
        `${WORKSPACE_API_URL}/${state.currentWorkspaceId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        }
      );
      if (!response.ok) {
        throw new Error("Nu s-a putut invita membrul");
      }
      alert("Invitația a fost trimisă.");
    } catch (error) {
      alert(error.message || "Eroare la invitarea membrului");
    }
  }

  function attachEvents() {
    if (dom.workspaceSelect) {
      dom.workspaceSelect.addEventListener("change", (event) => {
        setCurrentWorkspace(event.target.value);
      });
    }
    if (dom.workspaceCreateBtn) {
      dom.workspaceCreateBtn.addEventListener("click", handleCreateWorkspace);
    }
    if (dom.workspaceInviteBtn) {
      dom.workspaceInviteBtn.addEventListener("click", handleInviteMember);
    }
  }

  async function init() {
    attachEvents();
    await loadWorkspaces();
  }

  app.workspaces = {
    init,
    loadWorkspaces,
    setCurrentWorkspace,
    getCurrentWorkspaceId,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
