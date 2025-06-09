%% Step 1: Load test data
test_file = 'test_data1.mat';  % Replace with your test file path
loaded = load(test_file);
Data = loaded.Data;

n_trials = length(Data);
fprintf('Loaded %d test trials from %s\n', n_trials, test_file);

%% Step 2: Extract features one by one (consistent with training)
XTest = [];
for i = 1:n_trials
    d = Data(i);
    curve = d.pressure_curve;
    std_force = std(curve);
    num_peaks = numel(findpeaks(curve));
    num_valley = count_significant_valleys(curve, 400);  % New feature

    x_i = [d.delay, d.duration, d.max_force, std_force, num_peaks, num_valley];
    XTest = [XTest; x_i];
end

%% Step 3: Predict using rule-based model
Y_pred_labels = simpleMultiLabelClassify(XTest);  % N × 1 cell, each row like {'M3','M5'}, etc.

%% Step 4: Output predicted labels for each trial
tag_names = {'M1','M2','M3','M4','M5','M6','M7'};

for i = 1:n_trials
    fprintf('\n--- Trial %d ---\n', i);
    pred_tags = Y_pred_labels{i};

    for j = 1:numel(pred_tags)
        fprintf('Predicted: %s\n', pred_tags{j});
    end

    % Print one-hot encoded prediction (for comparison or output)
    one_hot = ismember(tag_names, pred_tags);
    fprintf('One-hot: [');
    fprintf('%d ', one_hot);
    fprintf(']\n');
end

function predicted_labels = simpleMultiLabelClassify(X)
% Rule-based multi-label classifier, outputs labels 'M1' ~ 'M7'
% Input X: N×6 matrix [delay, duration, maxF, stdF, peaks, valleys]
% Output predicted_labels: N×1 cell, each row contains a combination of labels such as {'M3','M5'}

    delay    = X(:,1);
    duration = X(:,2);
    maxF     = X(:,3);
    stdF     = X(:,4);
    peaks    = X(:,5);
    valleys  = X(:,6);
    N = size(X, 1);
    predicted_labels = cell(N, 1);

    for i = 1:N
        tags = {};

        if delay(i) > 2.0
            tags{end+1} = 'M2';  % delay
        end
        if duration(i) < 0.4
            tags{end+1} = 'M3';  % too short
        end
        if duration(i) > 2.5
            tags{end+1} = 'M4';  % too long
        end
        if maxF(i) < 107000
            tags{end+1} = 'M5';  % too weak
        end
        if maxF(i) > 130000
            tags{end+1} = 'M6';  % too strong
        end
        if valleys(i) > 0
            tags{end+1} = 'M7';  % jittery
        end

        if isempty(tags)
            tags = {'M1'};       % just right
        end

        predicted_labels{i} = tags;
    end
end

function [count, valid_valleys, reference_peaks] = count_significant_valleys(curve, min_diff)
    if nargin < 2
        min_diff = 400;
    end

    count = 0;
    valid_valleys = [];
    reference_peaks = [];

    [~, locs_min] = findpeaks(-curve);     % Candidate valleys
    [~, locs_max] = findpeaks(curve);      % All peaks

    for i = 1:length(locs_min)
        idx_valley = locs_min(i);
        valley_val = curve(idx_valley);

        % Find nearest peaks to the left and right of the valley
        left_idx = locs_max(locs_max < idx_valley);
        right_idx = locs_max(locs_max > idx_valley);

        % Both sides must have peaks
        if isempty(left_idx) || isempty(right_idx)
            continue;  % Skip if missing one side
        end

        % Peak values on both sides
        left_val = curve(left_idx(end));
        right_val = curve(right_idx(1));

        % Choose the smaller one as the reference
        if left_val <= right_val
            reference_val = left_val;
            reference_idx = left_idx(end);
        else
            reference_val = right_val;
            reference_idx = right_idx(1);
        end

        % Limit on horizontal distance
        if abs(reference_idx - idx_valley) > 8
            continue;
        end

        % Difference check
        diff_val = reference_val - valley_val;
        if diff_val >= min_diff
            count = count + 1;
            valid_valleys(end+1) = idx_valley;
            reference_peaks(end+1) = reference_idx;
        end
    end
end
