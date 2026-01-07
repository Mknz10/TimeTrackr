(function (app) {
  const { WORKSPACE_API_URL } = app.constants;
  const state = app.state;
  const dom = app.dom;

  function getWorkspaceList() {
    return Array.isArray(state.workspaces) ? state.workspaces : [];
  }

  function findWorkspaceIndexById(workspaceId) {
    const list = getWorkspaceList();
    const numericId = Number(workspaceId);
    if (!Number.isFinite(numericId)) {
      return -1;
    }
    return list.findIndex((workspace) => Number(workspace.id) === numericId);
  }

  function getWorkspaceById(workspaceId) {
    const list = getWorkspaceList();
    const numericId = Number(workspaceId);
    if (!Number.isFinite(numericId)) {
      return null;
    }
    return list.find((workspace) => Number(workspace.id) === numericId) || null;
  }

  function formatWorkspaceLabel(workspace) {
    if (!workspace) {
      return "Selectează un workspace";
    }
    if (workspace.name && typeof workspace.name === "string") {
      return workspace.name;
    }
    if (workspace.owner && typeof workspace.owner === "string") {
      return workspace.owner;
    }
    return "Workspace";
  }

  function updateNavigationVisibility(total) {
    const hasMultiple = Number.isFinite(total) && total > 1;
    if (dom.workspacePrevBtn) {
      dom.workspacePrevBtn.classList.toggle("hidden", !hasMultiple);
      dom.workspacePrevBtn.disabled = !hasMultiple;
    }
    if (dom.workspaceNextBtn) {
      dom.workspaceNextBtn.classList.toggle("hidden", !hasMultiple);
      dom.workspaceNextBtn.disabled = !hasMultiple;
    }
  }

  function updateWorkspaceDisplay() {
    const current = getWorkspaceById(state.currentWorkspaceId);
    if (dom.workspaceNameDisplay) {
      const list = getWorkspaceList();
      dom.workspaceNameDisplay.textContent = formatWorkspaceLabel(current);
      updateNavigationVisibility(list.length);
    }
    updateWorkspaceActionButtons(current);
  }

  function cycleWorkspace(direction) {
    if (!Number.isFinite(direction) || direction === 0) {
      return;
    }
    const list = getWorkspaceList();
    if (list.length <= 1) {
      return;
    }
    const currentIndex = findWorkspaceIndexById(state.currentWorkspaceId);
    if (currentIndex === -1) {
      const fallbackIndex = direction > 0 ? 0 : list.length - 1;
      setCurrentWorkspace(list[fallbackIndex].id);
      return;
    }
    const nextIndex = (currentIndex + direction + list.length) % list.length;
    setCurrentWorkspace(list[nextIndex].id);
  }

  function getCurrentWorkspaceId() {
    return state.currentWorkspaceId;
  }

  function updateMemberCount(count) {
    if (!dom.workspaceMemberCount) {
      return;
    }
    if (!Number.isFinite(count) || count <= 0) {
      dom.workspaceMemberCount.classList.add("hidden");
      dom.workspaceMemberCount.textContent = "";
      return;
    }
    dom.workspaceMemberCount.textContent = `${count} membri`;
    dom.workspaceMemberCount.classList.remove("hidden");
  }

  function setMemberViewState({ message, members, isError }) {
    if (!dom.workspaceMemberContent) {
      return;
    }
    const hasMembers = Array.isArray(members) && members.length > 0;

    if (dom.workspaceMemberEmptyState) {
      dom.workspaceMemberEmptyState.textContent = message || "";
      dom.workspaceMemberEmptyState.classList.toggle("hidden", hasMembers);
      dom.workspaceMemberEmptyState.classList.toggle(
        "text-red-600",
        Boolean(isError)
      );
      dom.workspaceMemberEmptyState.classList.toggle(
        "text-pink-800/70",
        !isError
      );
    }

    if (dom.workspaceMemberList) {
      dom.workspaceMemberList.classList.toggle("hidden", !hasMembers);
      if (!hasMembers) {
        dom.workspaceMemberList.innerHTML = "";
      }
    }

    updateMemberCount(hasMembers ? members.length : 0);
  }

  function formatRole(role) {
    if (!role || typeof role !== "string") {
      return "Member";
    }
    const lower = role.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  function normalizeRole(role) {
    if (typeof role !== "string") {
      return "";
    }
    return role.trim().toUpperCase();
  }

  function canRenameWorkspace(workspace) {
    if (!workspace) {
      return false;
    }
    const role = normalizeRole(workspace.role);
    return role === "OWNER";
  }

  function canLeaveWorkspace(workspace) {
    if (!workspace) {
      return false;
    }
    const role = normalizeRole(workspace.role);
    return Boolean(role) && role !== "OWNER";
  }

  function updateWorkspaceActionButtons(workspace) {
    const renameBtn = dom.workspaceRenameBtn;
    const leaveBtn = dom.workspaceLeaveBtn;
    const isWorkspaceContext = state.context === "workspace";

    if (renameBtn) {
      const allowRename = isWorkspaceContext && canRenameWorkspace(workspace);
      renameBtn.classList.toggle("hidden", !allowRename);
      renameBtn.disabled = !allowRename;
    }

    if (leaveBtn) {
      const allowLeave = isWorkspaceContext && canLeaveWorkspace(workspace);
      leaveBtn.classList.toggle("hidden", !allowLeave);
      leaveBtn.disabled = !allowLeave;
    }
  }

  async function extractErrorMessage(response, fallbackMessage) {
    const fallback = fallbackMessage || "A apărut o eroare";
    if (!response) {
      return fallback;
    }
    try {
      const text = await response.text();
      if (!text) {
        return fallback;
      }
      try {
        const parsed = JSON.parse(text);
        if (
          parsed &&
          typeof parsed.message === "string" &&
          parsed.message.trim()
        ) {
          return parsed.message.trim();
        }
      } catch (parseError) {
        // ignore JSON parse errors and fall back to raw text
      }
      return text.trim() || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function renderMembers(members) {
    if (!dom.workspaceMemberList) {
      return;
    }
    const list = Array.isArray(members) ? members : [];
    dom.workspaceMemberList.innerHTML = "";
    list.forEach((member) => {
      const item = document.createElement("li");
      item.className =
        "flex items-center justify-between gap-4 rounded-xl border border-white/70 bg-white/80 px-4 py-3 shadow";

      const identity = document.createElement("div");
      identity.className = "flex flex-col";

      const nameLabel = document.createElement("span");
      const displayName = member.name || member.username || "Utilizator";
      nameLabel.className = "text-sm font-semibold text-pink-900";
      nameLabel.textContent = displayName;
      identity.appendChild(nameLabel);

      if (member.username) {
        const usernameLabel = document.createElement("span");
        usernameLabel.className = "text-xs text-pink-700/70";
        usernameLabel.textContent = `@${member.username}`;
        identity.appendChild(usernameLabel);
      }

      item.appendChild(identity);

      const roleLabel = document.createElement("span");
      roleLabel.className =
        "rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pink-700";
      roleLabel.textContent = formatRole(member.role);
      item.appendChild(roleLabel);

      dom.workspaceMemberList.appendChild(item);
    });

    state.workspaceMembers = list;
    setMemberViewState({ members: list, message: "" });
  }

  async function loadWorkspaceMembers(workspaceId) {
    if (state.context !== "workspace") {
      return;
    }
    if (!workspaceId) {
      state.workspaceMembers = [];
      setMemberViewState({
        members: [],
        message: "Selectează un workspace pentru a vedea membrii aferenți.",
      });
      return;
    }
    setMemberViewState({ members: [], message: "Se încarcă membrii..." });
    try {
      const response = await fetch(
        `${WORKSPACE_API_URL}/${workspaceId}/members`
      );
      if (!response.ok) {
        throw new Error("Nu s-au putut încărca membrii");
      }
      const members = await response.json();
      if (Array.isArray(members) && members.length > 0) {
        renderMembers(members);
      } else {
        state.workspaceMembers = [];
        setMemberViewState({
          members: [],
          message: "Nu există membri în acest workspace încă.",
        });
      }
    } catch (error) {
      console.error("Error loading workspace members", error);
      state.workspaceMembers = [];
      setMemberViewState({
        members: [],
        message: "Nu s-au putut încărca membrii.",
        isError: true,
      });
    }
  }

  function setCurrentWorkspace(id) {
    if (state.context !== "workspace") {
      return;
    }
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      state.currentWorkspaceId = null;
      if (dom.workspaceSelect) {
        dom.workspaceSelect.value = "";
      }
      loadWorkspaceMembers(null);
      updateWorkspaceDisplay();
      return;
    }
    const workspace = getWorkspaceById(numericId);
    if (!workspace) {
      state.currentWorkspaceId = null;
      if (dom.workspaceSelect) {
        dom.workspaceSelect.value = "";
      }
      loadWorkspaceMembers(null);
      updateWorkspaceDisplay();
      return;
    }
    if (state.currentWorkspaceId === Number(workspace.id)) {
      updateWorkspaceDisplay();
      return;
    }
    state.currentWorkspaceId = Number(workspace.id);
    if (dom.workspaceSelect) {
      dom.workspaceSelect.value = String(workspace.id);
    }
    if (app.categories && typeof app.categories.loadCategories === "function") {
      app.categories.loadCategories();
    }
    if (app.activities && typeof app.activities.loadActivities === "function") {
      app.activities.loadActivities();
    }
    loadWorkspaceMembers(state.currentWorkspaceId);
    updateWorkspaceDisplay();
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
      option.textContent = `${
        workspace.name
      } (${workspace.role.toLowerCase()})`;
      dom.workspaceSelect.appendChild(option);
    });
    if (Number.isFinite(Number(state.currentWorkspaceId))) {
      dom.workspaceSelect.value = String(state.currentWorkspaceId);
    }
    updateWorkspaceDisplay();
  }

  async function loadWorkspaces() {
    try {
      const workspaces = await fetchWorkspaces();
      state.workspaces = Array.isArray(workspaces) ? workspaces : [];
      populateSelect(state.workspaces);
      const currentExists =
        Number.isFinite(Number(state.currentWorkspaceId)) &&
        findWorkspaceIndexById(state.currentWorkspaceId) !== -1;

      if (!currentExists) {
        state.currentWorkspaceId = null;
      }

      if (state.workspaces.length) {
        const targetWorkspaceId = currentExists
          ? state.currentWorkspaceId
          : state.workspaces[0].id;
        setCurrentWorkspace(targetWorkspaceId);
      } else {
        state.currentWorkspaceId = null;
        if (dom.workspaceSelect) {
          dom.workspaceSelect.value = "";
        }
        updateWorkspaceDisplay();
        loadWorkspaceMembers(null);
        if (
          app.activities &&
          typeof app.activities.loadActivities === "function"
        ) {
          app.activities.loadActivities();
        }
      }
    } catch (error) {
      console.error("Error loading workspaces", error);
      state.workspaces = [];
      state.currentWorkspaceId = null;
      if (dom.workspaceSelect) {
        dom.workspaceSelect.value = "";
      }
      updateWorkspaceDisplay();
      loadWorkspaceMembers(null);
      if (
        app.activities &&
        typeof app.activities.loadActivities === "function"
      ) {
        app.activities.loadActivities();
      }
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
      const created = await response.json();
      state.currentWorkspaceId = created.id;
      await loadWorkspaces();
      setCurrentWorkspace(created.id);
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

  async function handleRenameWorkspace() {
    if (!state.currentWorkspaceId) {
      alert("Selectați un workspace mai întâi.");
      return;
    }
    const workspace = getWorkspaceById(state.currentWorkspaceId);
    if (!workspace) {
      alert("Workspace-ul selectat nu mai este disponibil.");
      await loadWorkspaces();
      return;
    }
    if (!canRenameWorkspace(workspace)) {
      alert("Nu aveți permisiunea de a redenumi acest workspace.");
      return;
    }
    const currentName =
      typeof workspace.name === "string" ? workspace.name : "";
    const proposedName = prompt(
      "Introduceți noul nume pentru workspace:",
      currentName
    );
    if (proposedName === null) {
      return;
    }
    const trimmedName = proposedName.trim();
    if (!trimmedName) {
      alert("Numele workspace-ului nu poate fi gol.");
      return;
    }
    if (trimmedName === currentName.trim()) {
      return;
    }
    try {
      const response = await fetch(`${WORKSPACE_API_URL}/${workspace.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          "Nu s-a putut redenumi workspace-ul"
        );
        throw new Error(message);
      }
      await response.json().catch(() => null);
      await loadWorkspaces();
      alert("Workspace-ul a fost redenumit cu succes.");
    } catch (error) {
      alert(error.message || "Eroare la redenumirea workspace-ului");
    }
  }

  async function handleLeaveWorkspace() {
    if (!state.currentWorkspaceId) {
      alert("Selectați un workspace mai întâi.");
      return;
    }
    const workspace = getWorkspaceById(state.currentWorkspaceId);
    if (!workspace) {
      alert("Workspace-ul selectat nu mai este disponibil.");
      await loadWorkspaces();
      return;
    }
    if (!canLeaveWorkspace(workspace)) {
      alert("Owner-ul nu poate părăsi direct workspace-ul.");
      return;
    }
    const workspaceName =
      typeof workspace.name === "string" && workspace.name.trim()
        ? workspace.name.trim()
        : "acest workspace";
    const confirmed = confirm(`Sigur vrei să părăsești ${workspaceName}?`);
    if (!confirmed) {
      return;
    }
    try {
      const response = await fetch(
        `${WORKSPACE_API_URL}/${workspace.id}/members/me`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          "Nu s-a putut părăsi workspace-ul"
        );
        throw new Error(message);
      }
      state.currentWorkspaceId = null;
      await loadWorkspaces();
      alert("Ai părăsit workspace-ul.");
    } catch (error) {
      alert(error.message || "Eroare la părăsirea workspace-ului");
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
    if (dom.workspaceRenameBtn) {
      dom.workspaceRenameBtn.addEventListener("click", handleRenameWorkspace);
    }
    if (dom.workspaceLeaveBtn) {
      dom.workspaceLeaveBtn.addEventListener("click", handleLeaveWorkspace);
    }
    if (dom.workspacePrevBtn) {
      dom.workspacePrevBtn.addEventListener("click", () => cycleWorkspace(-1));
    }
    if (dom.workspaceNextBtn) {
      dom.workspaceNextBtn.addEventListener("click", () => cycleWorkspace(1));
    }
  }

  async function init() {
    if (state.context !== "workspace") {
      return;
    }
    attachEvents();
    await loadWorkspaces();
  }

  app.workspaces = {
    init,
    loadWorkspaces,
    setCurrentWorkspace,
    getCurrentWorkspaceId,
    loadWorkspaceMembers,
    renameCurrentWorkspace: handleRenameWorkspace,
    leaveCurrentWorkspace: handleLeaveWorkspace,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
