package com.example.proiectpaw.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.proiectpaw.dto.UserActivityView;
import com.example.proiectpaw.model.Activity;
import com.example.proiectpaw.model.User;
import com.example.proiectpaw.model.WorkspaceActivity;
import com.example.proiectpaw.repository.ActivityRepository;
import com.example.proiectpaw.repository.UserRepository;
import com.example.proiectpaw.repository.WorkspaceActivityRepository;

@Service
public class ActivityService {
    private final ActivityRepository repository;
    private final UserRepository userRepository;
    private final WorkspaceActivityRepository workspaceActivityRepository;

    public ActivityService(ActivityRepository repository,
                           UserRepository userRepository,
                           WorkspaceActivityRepository workspaceActivityRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.workspaceActivityRepository = workspaceActivityRepository;
    }

    @Transactional(readOnly = true)
    public List<UserActivityView> getPersonalActivities(String username) {
        List<Activity> personalActivities = repository.findByUserUsernameOrderByStartTimeAsc(username);
        List<WorkspaceActivity> workspaceActivities =
                workspaceActivityRepository.findByUserUsernameOrderByStartTimeAsc(username);

        List<UserActivityView> combined = new ArrayList<>();
        for (Activity activity : personalActivities) {
            combined.add(UserActivityView.fromPersonal(activity));
        }
        for (WorkspaceActivity workspaceActivity : workspaceActivities) {
            combined.add(UserActivityView.fromWorkspace(workspaceActivity));
        }

        combined.sort(Comparator.comparing(UserActivityView::getStartTime));
        return combined;
    }

    public Activity addPersonalActivity(Activity activity, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        validateTiming(activity);

        List<Activity> segments = splitActivityByDay(activity, user);
        Activity firstSaved = null;
        for (Activity segment : segments) {
            Activity saved = repository.save(segment);
            if (firstSaved == null) {
                firstSaved = saved;
            }
        }
        return firstSaved;
    }

    public void deletePersonalActivity(Long id, String username) {
        Activity activity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
        if (activity.getUser() == null || !username.equals(activity.getUser().getUsername())) {
            throw new IllegalArgumentException("Cannot delete activity for a different user");
        }
        repository.delete(activity);
    }

    private void validateTiming(Activity activity) {
        if (activity.getStartTime() == null || activity.getEndTime() == null) {
            throw new IllegalArgumentException("Start time and end time are required");
        }
        if (!activity.getEndTime().isAfter(activity.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }
    }

    private List<Activity> splitActivityByDay(Activity source, User user) {
        List<Activity> segments = new ArrayList<>();
        LocalDateTime segmentStart = source.getStartTime();
        LocalDateTime end = source.getEndTime();

        while (segmentStart.toLocalDate().isBefore(end.toLocalDate())) {
            LocalDateTime midnight = segmentStart.toLocalDate().plusDays(1).atStartOfDay();
            segments.add(buildSegment(source, user, segmentStart, midnight));
            segmentStart = midnight;
        }

        if (segmentStart.isBefore(end)) {
            segments.add(buildSegment(source, user, segmentStart, end));
        }

        if (segments.isEmpty()) {
            segments.add(buildSegment(source, user, segmentStart, end));
        }

        return segments;
    }

    private Activity buildSegment(Activity source, User user, LocalDateTime start, LocalDateTime end) {
        Activity segment = new Activity();
        segment.setName(source.getName());
        segment.setCategory(source.getCategory());
        segment.setStartTime(start);
        segment.setEndTime(end);
        segment.setHours(calculateHours(start, end));
        segment.setUser(user);
        return segment;
    }

    private double calculateHours(LocalDateTime start, LocalDateTime end) {
        Duration duration = Duration.between(start, end);
        return duration.toMinutes() / 60.0;
    }
}