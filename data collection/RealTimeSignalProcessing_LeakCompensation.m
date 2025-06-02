%% Clear environment and initialize
clear; clc; close all;

% Set up serial port
port = 'COM3';   % Change to your actual Arduino port
baudrate = 9600; % Baud rate
s = serialport(port, baudrate);

configureTerminator(s, "LF"); % Read one line per terminator
flush(s); % Clear serial buffer

%% Parameters
fs = 10;            % Sampling frequency (Hz)
fh = 0.05;          % High-pass filter cutoff frequency (Hz)
order = 4;          % High-pass filter order
samples_to_read = 300; % Number of points to collect

% Initialize arrays
data_raw = zeros(samples_to_read,1);
data_filtered = zeros(samples_to_read,1);
time_vector = (0:(samples_to_read-1)) / fs;

% Design high-pass filter
[b, a] = butter(order, fh/(fs/2), 'high');

% Jump detection parameters
jump_threshold = -100;  % ΔP less than -100 Pa is considered a jump
cooldown_time = 0.5;    % After a jump, no new jumps within 0.5 sec
last_jump_time = -inf;  % Last jump time (s)

% Initialize plot
figure;
h_raw = plot(NaN, NaN, 'k--'); hold on;    % Raw pressure (dashed black)
h_filtered = plot(NaN, NaN, 'r-');         % Filtered pressure (red)
h_jumps = plot(NaN, NaN, 'ro', 'MarkerSize',8); % Jump points (red circles)
grid on;
xlabel('Time (s)');
ylabel('Pressure Change (Pa)');
title('Real-Time Pressure Change and Jump Detection');
xlim([0 time_vector(end)]);
ylim([-20000 20000]);

disp('⏳ Starting real-time data acquisition...');

%% Data acquisition loop
for i = 1:samples_to_read
    % Read one line
    line = readline(s);
    pressure = str2double(line);

    % Save raw data
    data_raw(i) = pressure;

    % Apply high-pass filter
    if i > order*3
        data_filtered(1:i) = filtfilt(b, a, data_raw(1:i));
    else
        data_filtered(1:i) = data_raw(1:i);
    end

    % Calculate pressure change (relative to first point)
    press_delta = data_raw(1:i) - data_raw(1);

    % Jump detection (based on ΔP)
    if i >= 2
        deltaP = press_delta(i) - press_delta(i-1);
        current_time = time_vector(i);
        if (deltaP < jump_threshold) && (current_time - last_jump_time > cooldown_time)
            disp(['🛫 Jump detected! Time = ' num2str(current_time) ' s']);
            % Mark the jump point
            h_jumps.XData(end+1) = current_time;
            h_jumps.YData(end+1) = press_delta(i);
            last_jump_time = current_time;
        end
    end

    % Real-time plot update
    set(h_raw, 'XData', time_vector(1:i), 'YData', press_delta(1:i));
    set(h_filtered, 'XData', time_vector(1:i), 'YData', data_filtered(1:i));
    drawnow;

    % Auto-exit if figure window is closed
    if ~isvalid(h_raw)
        disp('❌ Figure closed, stopping acquisition');
        break;
    end
end

disp('✅ Data acquisition completed!');

%% Leak compensation
threshold = mean(data_filtered) + std(data_filtered);
pressing_idx = find(data_filtered > threshold);

if ~isempty(pressing_idx)
    p = polyfit(pressing_idx, data_filtered(pressing_idx), 1);
    trend = polyval(p, pressing_idx);
    data_corrected = data_filtered;
    data_corrected(pressing_idx) = data_filtered(pressing_idx) - (trend - mean(trend));
else
    data_corrected = data_filtered;
    disp('⚡️ No sustained pressing detected.');
end

%% Final comparison plot
figure;
plot(time_vector, data_raw - data_raw(1), 'k--');
hold on;
plot(time_vector, data_filtered, 'r');
plot(time_vector, data_corrected, 'g');
legend('Raw Signal (\DeltaP)', 'High-Pass Filtered', 'Leak Compensated');
xlabel('Time (s)');
ylabel('Pressure Change (Pa)');
title('Final Signal Processing Comparison');
grid on;
