%% Read data
data = load('press.csv');
press = data(:);  % Ensure it is a column vector
figure;
plot(press);
title('Raw Signal (Initial View)');
xlabel('Sample Index');
ylabel('Pressure');

%% Parameter settings
fs = 10;       % Sampling rate 10Hz
fh = 0.05;     % High-pass filter cutoff frequency 0.05Hz
order = 4;     % High-pass filter order

%% Step 1: Display raw signal
figure;
subplot(3,1,1);
plot(press, 'b');
title('Raw Signal');
xlabel('Sample Index');
ylabel('Pressure');
grid on;

%% Step 2: High-pass filtering to remove drift
[b, a] = butter(order, fh/(fs/2), 'high');  
press_filtered = filtfilt(b, a, press);

subplot(3,1,2);
plot(press_filtered, 'r');
title('High-pass Filtered Signal (Drift Removed)');
xlabel('Sample Index');
ylabel('Pressure');
grid on;

%% Step 3: Compensate leakage trend during sustained press (linear fitting)
threshold = mean(press_filtered) + std(press_filtered);  % Dynamic threshold
pressing_idx = find(press_filtered > threshold);         % Find indices during press

% Prevent error
if ~isempty(pressing_idx)
    % Perform linear fitting on press interval
    p = polyfit(pressing_idx, press_filtered(pressing_idx), 1);  % Linear fit
    trend = polyval(p, pressing_idx);  % Generate trend line

    % Compensate trend: flatten the press segment
    press_corrected = press_filtered;
    press_corrected(pressing_idx) = press_filtered(pressing_idx) - (trend - mean(trend));
else
    press_corrected = press_filtered;
    disp('⚡ Notice: No clear sustained press interval detected');
end

%% Step 4: Plot compensated signal
subplot(3,1,3);
plot(press_corrected, 'g');
title('Leakage-compensated Signal');
xlabel('Sample Index');
ylabel('Pressure');
grid on;

%% Done
disp('✅ Done: Data loading + High-pass filtering + Leakage compensation!');
