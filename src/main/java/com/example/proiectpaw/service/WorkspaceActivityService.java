package com.example.proiectpaw.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.proiectpaw.dto.UserActivityView;
import com.example.proiectpaw.model.User;
import com.example.proiectpaw.model.Workspace;
import com.example.proiectpaw.model.WorkspaceActivity;
import com.example.proiectpaw.repository.UserRepository;
import com.example.proiectpaw.repository.WorkspaceActivityRepository;

@Service
public class WorkspaceActivityService {

    private final WorkspaceActivityRepository activityRepository;
    private final WorkspaceService workspaceService;
    private final UserRepository userRepository;

    public WorkspaceActivityService(WorkspaceActivityRepository activityRepository,
                                    WorkspaceService workspaceService,
                                    UserRepository userRepository) {
        this.activityRepository = activityRepository;
        this.workspaceService = workspaceService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<UserActivityView> getActivitiesForWorkspace(String username, Long workspaceId) {
        workspaceService.getWorkspaceForUser(username, workspaceId);
        List<WorkspaceActivity> activities = activityRepository.findByWorkspaceIdOrderByStartTimeAsc(workspaceId);
        List<UserActivityView> result = new ArrayList<>();
        for (WorkspaceActivity activity : activities) {
            result.add(UserActivityView.fromWorkspace(activity));
        }
        return result;
    }

    @Transactional
    public WorkspaceActivity addActivityForWorkspace(WorkspaceActivity activity, String username, Long workspaceId) {
        Workspace workspace = workspaceService.getWorkspaceForUser(username, workspaceId);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        validateTiming(activity);

        List<WorkspaceActivity> segments = splitActivityByDay(activity, workspace, user);
        WorkspaceActivity firstSaved = null;
        for (WorkspaceActivity segment : segments) {
            WorkspaceActivity saved = activityRepository.save(segment);
            if (firstSaved == null) {
                firstSaved = saved;
            }
        }
        return firstSaved;
    }

    @Transactional
    public void deleteWorkspaceActivity(Long id, String username, Long workspaceId) {
        workspaceService.getWorkspaceForUser(username, workspaceId);
        WorkspaceActivity activity = activityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
        if (!activity.getWorkspace().getId().equals(workspaceId)) {
            throw new IllegalArgumentException("Activity not found in workspace");
        }
        if (!activity.getUser().getUsername().equals(username)) {
            throw new IllegalArgumentException("Cannot delete activity for a different user");
        }
        activityRepository.delete(activity);
    }

    private void validateTiming(WorkspaceActivity activity) {
        if (activity.getStartTime() == null || activity.getEndTime() == null) {
            throw new IllegalArgumentException("Start time and end time are required");
        }
        if (!activity.getEndTime().isAfter(activity.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }
    }

    private List<WorkspaceActivity> splitActivityByDay(WorkspaceActivity source, Workspace workspace, User user) {
        List<WorkspaceActivity> segments = new ArrayList<>();
        LocalDateTime segmentStart = source.getStartTime();
        LocalDateTime end = source.getEndTime();

        while (segmentStart.toLocalDate().isBefore(end.toLocalDate())) {
            LocalDateTime midnight = segmentStart.toLocalDate().plusDays(1).atStartOfDay();
            segments.add(buildSegment(source, workspace, user, segmentStart, midnight));
            segmentStart = midnight;
        }

        if (segmentStart.isBefore(end)) {
            segments.add(buildSegment(source, workspace, user, segmentStart, end));
        }

        if (segments.isEmpty()) {
            segments.add(buildSegment(source, workspace, user, segmentStart, end));
        }

        return segments;
    }

    private WorkspaceActivity buildSegment(WorkspaceActivity source, Workspace workspace, User user,
                                           LocalDateTime start, LocalDateTime end) {
        WorkspaceActivity segment = new WorkspaceActivity();
        segment.setName(source.getName());
        segment.setCategory(source.getCategory());
        segment.setStartTime(start);
        segment.setEndTime(end);
        segment.setHours(calculateHours(start, end));
        segment.setWorkspace(workspace);
        segment.setUser(user);
        return segment;
    }

    private double calculateHours(LocalDateTime start, LocalDateTime end) {
        Duration duration = Duration.between(start, end);
        return duration.toMinutes() / 60.0;
    }
}
