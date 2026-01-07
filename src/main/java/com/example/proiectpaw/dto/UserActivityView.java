package com.example.proiectpaw.dto;

import java.time.LocalDateTime;

import com.example.proiectpaw.model.Activity;
import com.example.proiectpaw.model.Workspace;
import com.example.proiectpaw.model.WorkspaceActivity;

public class UserActivityView {

    public static final String SOURCE_PERSONAL = "PERSONAL";
    public static final String SOURCE_WORKSPACE = "WORKSPACE";

    private Long id;
    private String name;
    private String category;
    private double hours;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String source;
    private Long workspaceId;
    private String workspaceName;

    public UserActivityView() {
    }

    public static UserActivityView fromPersonal(Activity activity) {
        UserActivityView view = new UserActivityView();
        view.id = activity.getId();
        view.name = activity.getName();
        view.category = activity.getCategory();
        view.hours = activity.getHours();
        view.startTime = activity.getStartTime();
        view.endTime = activity.getEndTime();
        view.source = SOURCE_PERSONAL;
        return view;
    }

    public static UserActivityView fromWorkspace(WorkspaceActivity activity) {
        UserActivityView view = new UserActivityView();
        view.id = activity.getId();
        view.name = activity.getName();
        view.category = activity.getCategory();
        view.hours = activity.getHours();
        view.startTime = activity.getStartTime();
        view.endTime = activity.getEndTime();
        view.source = SOURCE_WORKSPACE;
        Workspace workspace = activity.getWorkspace();
        if (workspace != null) {
            view.workspaceId = workspace.getId();
            view.workspaceName = workspace.getName();
        }
        return view;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public double getHours() {
        return hours;
    }

    public void setHours(double hours) {
        this.hours = hours;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Long getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(Long workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getWorkspaceName() {
        return workspaceName;
    }

    public void setWorkspaceName(String workspaceName) {
        this.workspaceName = workspaceName;
    }
}
