%% Experiment Setup
clear; clc;

behavior_mode = 'M7';             % Set behavior label M1~M7
n_trials = 10;                    % Repetitions for this behavior
interval = 5;                     % Cue interval in seconds
% M1 normal,  M3 short, M5 weak =3
% M2 delayed, M4 long           =7
% M6 strong,  M7 jittery        =5
press_threshold = 102000;           % Pressure threshold to detect press start (in hPa)
release_threshold = 102000;         % Release threshold (when below this = released)
max_duration = interval;                 % Max wait after cue

% === Setup COM3 serial for BMP280 ===
serialObj = serialport("COM3", 9600);
configureTerminator(serialObj, "LF");
flush(serialObj);
pause(2);  % Wait for Arduino to reset

read_pressure = @() str2double(readline(serialObj));  % Read pressure from BMP280

% === Load cue image ===
cue_img = imread('cue7.png');  % replace with your actual image

% === Initialize storage ===
Data = struct('trial', {}, 'label', {}, 'cue_time', {}, ...
              'press_time', {}, 'release_time', {}, 'duration', {}, ...
              'delay', {}, 'max_force', {}, 'pressure_curve', {}, ...
              'time_series', {});

disp(['Starting behavior: ', behavior_mode]);
pause(1);

%% Main Trial Loop
for i = 1:n_trials
    fprintf('\n--- Trial %d/%d ---\n', i, n_trials);

    % === Cue display ===
    figure(100); imshow(cue_img); title(['CUE: ', behavior_mode]);
    drawnow;
    cue_ts = datetime('now');     % Timestamp
    cue_timer = tic;

    % === Press detection ===
    t0 = tic;
    t_series = [];
    p_series = [];
    press_detected = false;
    release_detected = false;
    press_time = NaN;
    release_time = NaN;
    max_force = -Inf;

    while toc(t0) < max_duration
        t_now = toc(t0);
        p_now = read_pressure();  % Read from sensor
        if isnan(p_now), continue; end  % Skip invalid reads

        t_series(end+1) = t_now;
        p_series(end+1) = p_now;
        max_force = max(max_force, p_now);

        if ~press_detected && p_now > press_threshold
            press_time = t_now;
            press_detected = true;
            disp('Press detected');
        end
        if press_detected && ~release_detected && p_now < release_threshold
            release_time = t_now;
            release_detected = true;
            disp('Release detected');
            %break;
        end
        pause(0.01);
    end

    close(100);  % Close cue image

    % === Feature computation ===
    if ~isnan(press_time)
        delay = press_time;

        if ~isnan(release_time)
            duration = release_time - press_time;
        else
            % If no release detected, use the full trial time as end
            duration = toc(t0) - press_time;
        end
    else
        delay = NaN;
        duration = NaN;
    end

    % === Store data ===
    Data(end+1).trial = i;
    Data(end).label = behavior_mode;
    Data(end).cue_time = cue_ts;
    Data(end).press_time = press_time;
    Data(end).release_time = release_time;
    Data(end).duration = duration;
    Data(end).delay = delay;
    Data(end).max_force = max_force;
    Data(end).pressure_curve = p_series;
    Data(end).time_series = t_series;

    % === Wait until next trial ===
    time_left = interval - toc(cue_timer);
    if time_left > 0
        pause(time_left);
    end
end

% === Clean up ===
clear serialObj;
disp('✅ Experiment complete!');

% === Save results ===
filename = ['press_data_' behavior_mode '_' datestr(now,'HHMMSS') '.mat'];
save(filename, 'Data');
disp(['Data saved to ', filename]);
