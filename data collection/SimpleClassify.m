%% Step 1: Load and merge multiple data files using real labels
clear; clc;

data_folder = fullfile(pwd, 'Data');  
file_pattern = fullfile(data_folder, 'press_data_*.mat');
files = dir(file_pattern);

X = [];
label_strs = {};

for f = 1:length(files)
    filepath = fullfile(data_folder, files(f).name);
    loaded = load(filepath);

    if isfield(loaded, 'Data')
        Data = loaded.Data;
        for i = 1:length(Data)
            d = Data(i);
            curve = d.pressure_curve;
            std_force = std(curve);
            num_peaks = numel(findpeaks(curve));
            num_valley = count_significant_valleys(curve, 400);

            x_i = [d.delay, d.duration, d.max_force, std_force, num_peaks,num_valley];
            X = [X; x_i];
            label_strs{end+1} = d.label;
        end
    else
        warning('No "Data" variable in %s', file_list(f).name);
    end
end

feature_names = {'Delay','Duration','MaxForce','StdForce','NumPeaks','NumValley'};
tag_names = {'M1','M2','M3','M4','M5','M6','M7'};
num_classes = numel(tag_names);

% ---------- Step 2: Convert Labels to One-Hot ----------
Y = zeros(length(label_strs), num_classes);
for i = 1:length(label_strs)
    idx = strcmp(tag_names, label_strs{i});
    Y(i, idx) = 1;
end

% ---------- Step 3: Split ----------
cv = cvpartition(size(X,1), 'HoldOut', 0.3);
XTest  = X(test(cv), :);
YTest  = Y(test(cv), :);

% ---------- Step 4: Predict using Rule Model ----------
Y_pred_labels = simpleMultiLabelClassify(XTest);  % Output: cell array of {'M3','M5'} etc.

% ---------- Step 5: Convert Predicted Labels to One-Hot ----------
Y_pred = zeros(size(YTest));

for i = 1:length(Y_pred_labels)
    tags = Y_pred_labels{i};
    for j = 1:numel(tags)
        idx = find(strcmp(tag_names, tags{j}));
        if ~isempty(idx)
            Y_pred(i, idx) = 1;
        end
    end
end

% ---------- Step 6: Evaluation (Updated) ----------
fprintf('\n=== Per-Label Evaluation (Precision / Recall / F1) ===\n');

TP_total = 0; FP_total = 0; FN_total = 0;

for i = 1:num_classes
    TP = sum((Y_pred(:,i) == 1) & (YTest(:,i) == 1));
    FP = sum((Y_pred(:,i) == 1) & (YTest(:,i) == 0));
    FN = sum((Y_pred(:,i) == 0) & (YTest(:,i) == 1));
    
    precision = TP / (TP + FP + eps);
    recall = TP / (TP + FN + eps);
    f1 = 2 * precision * recall / (precision + recall + eps);
    
    fprintf('%s:\tP = %.2f\tR = %.2f\tF1 = %.2f\t(TP=%d, FP=%d, FN=%d)\n', ...
        tag_names{i}, precision, recall, f1, TP, FP, FN);
    
    % for micro averaging
    TP_total = TP_total + TP;
    FP_total = FP_total + FP;
    FN_total = FN_total + FN;
end

% --- Micro-averaged metrics ---
micro_precision = TP_total / (TP_total + FP_total + eps);
micro_recall    = TP_total / (TP_total + FN_total + eps);
micro_f1        = 2 * micro_precision * micro_recall / (micro_precision + micro_recall + eps);

fprintf('\n=== Micro-Averaged Performance ===\n');
fprintf('Micro Precision: %.2f\n', micro_precision);
fprintf('Micro Recall:    %.2f\n', micro_recall);
fprintf('Micro F1-score:  %.2f\n', micro_f1);

% --- Exact Match Accuracy ---
exact_match = all(Y_pred == YTest, 2);
acc_exact = mean(exact_match);
fprintf('\n=== Exact Match Accuracy ===\n');
fprintf('Exact Match Accuracy: %.2f%%\n', acc_exact * 100);

%%
function predicted_labels = simpleMultiLabelClassify(X)
% Rule-based multi-label classifier, with output labels named 'M1' to 'M7'
% Input X: N×5 matrix [delay, duration, maxF, stdF, peaks]
% Output predicted_labels: N×1 cells, with each line being a combination of labels such as {'M3','M5'}, etc

    delay    = X(:,1);
    duration = X(:,2);
    maxF     = X(:,3);
    stdF     = X(:,4);
    peaks    = X(:,5);
    valleys   =X(:,6);
    N = size(X, 1);
    predicted_labels = cell(N, 1);

    for i = 1:N
        tags = {};

        if delay(i) > 2.5
            tags{end+1} = 'M2';  % delay
        end
        if duration(i) < 0.35
            tags{end+1} = 'M3';  % too short
        end
        if duration(i) > 2.8
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

    [~, locs_min] = findpeaks(-curve);     % valley candidates
    [~, locs_max] = findpeaks(curve);      % All wave peaks

    for i = 1:length(locs_min)
        idx_valley = locs_min(i);
        valley_val = curve(idx_valley);

        % Look for the nearest peak around valley
        left_idx = locs_max(locs_max < idx_valley);
        right_idx = locs_max(locs_max > idx_valley);

        % There must be peaks on both sides
        if isempty(left_idx) || isempty(right_idx)
            continue;
        end

        % The peaks on both sides
        left_val = curve(left_idx(end));
        right_val = curve(right_idx(1));

        % Choose the smallest one as a reference
        if left_val <= right_val
            reference_val = left_val;
            reference_idx = left_idx(end);
        else
            reference_val = right_val;
            reference_idx = right_idx(1);
        end

        % Horizontal coordinate spacing limit
        if abs(reference_idx - idx_valley) > 5
            continue;
        end
        if reference_idx > 45
            continue;
        end
        % Difference judgment
        diff_val = reference_val - valley_val;
        if diff_val >= min_diff
            count = count + 1;
            valid_valleys(end+1) = idx_valley;
            reference_peaks(end+1) = reference_idx;
        end
    end
end
