%% Experiment Setup
clear; clc;

behavior_mode = 'M1';                % Set behavior label M1~M7
n_trials = 5;                        % Repetitions for this behavior
interval = 5;                        % Cue interval in seconds (精确控制)
press_threshold = 102000;            % Pressure threshold to detect press start (in hPa)
release_threshold = 103000;          % Release threshold (when below this = released)
max_duration = 5;                    % Max wait after cue (读取数据最长持续时间)

% === Setup COM3 serial for BMP280 ===
serialObj = serialport("COM3", 9600);
configureTerminator(serialObj, "LF");
flush(serialObj);
pause(2);  % Wait for Arduino to reset

read_pressure = @() str2double(readline(serialObj));  % Read pressure from BMP280

% === Load cue image ===
cue_img = imread('cue1.png');  % Replace with your actual image

% === Initialize storage ===
Data = struct('trial', {}, 'label', {}, 'cue_time', {}, ...
              'press_time', {}, 'release_time', {}, 'duration', {}, ...
              'delay', {}, 'max_force', {}, 'pressure_curve', {}, ...
              'time_series', {});

disp(['Starting behavior: ', behavior_mode]);
pause(1);

%% Main Trial Loop with precise cue timing
start_time = datetime('now');   % 🔧 初始化时间基准

for i = 1:n_trials
    fprintf('\n--- Trial %d/%d ---\n', i, n_trials);

    % === Wait until target cue time === 🔧
    cue_time_target = start_time + seconds((i - 1) * interval);
    while datetime('now') < cue_time_target
        pause(0.01);  % wait until cue_time_target
    end

    % === Cue display ===
    figure(100); imshow(cue_img); title(['CUE: ', behavior_mode]);
    drawnow;
    cue_ts = datetime('now');   % 🔧 实际 cue 时间

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
        end
        pause(0.01);
    end

    close(100);  % Close cue image

    % === Feature computation ===
    if ~isnan(press_time) && ~isnan(release_time)
        duration = release_time - press_time;
        delay = press_time;
    else
        duration = NaN;
        delay = NaN;
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
    fprintf('Trial %d duration (wall time): %.2f sec\n', i, seconds(datetime('now') - cue_ts));
end

% === Clean up ===
clear serialObj;
disp('✅ Experiment complete!');

% === Save results ===
filename = ['press_data_' behavior_mode '_' datestr(now,'HHMMSS') '.mat'];
save(filename, 'Data');
disp(['Data saved to ', filename]);
