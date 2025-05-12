%% Step 1: Load and merge multiple data files using real labels
clear; clc;

file_pattern = fullfile(pwd, 'press_data_*.mat');
files = dir(file_pattern);

X = [];
Y = [];
label_strs = {};  % Temporarily store string labels

for f = 1:length(files)
    filepath = fullfile(pwd, files(f).name);
    loaded = load(filepath);
    
    if isfield(loaded, 'Data')
        Data = loaded.Data;
        
        for i = 1:length(Data)
            % Feature extraction
            delay = Data(i).delay;
            duration = Data(i).duration;
            max_force = Data(i).max_force;
            curve = Data(i).pressure_curve;
            std_force = std(curve);
            num_peaks = numel(findpeaks(curve));

            x_i = [delay, duration, max_force, std_force, num_peaks];
            X = [X; x_i];

            % Collect label strings (e.g., 'M1', 'M2', ...)
            label_strs{end+1} = Data(i).label;
        end
    else
        warning('Variable "Data" not found in file %s', files(f).name);
    end
end

% Convert label strings to one-hot encoded matrix
unique_labels = {'M1','M2','M3','M4','M5','M6','M7'};  % M1 = Normal
num_classes = numel(unique_labels);
Y = zeros(length(label_strs), num_classes);
for i = 1:length(label_strs)
    idx = find(strcmp(unique_labels, label_strs{i}));
    Y(i, idx) = 1;
end

feature_names = {'Delay','Duration','MaxForce','StdForce','NumPeaks'};
tag_names = unique_labels;

%% Step 2: Train/test split
cv = cvpartition(size(X,1), 'HoldOut', 0.3);
XTrain = X(training(cv),:);
YTrain = Y(training(cv),:);
XTest  = X(test(cv),:);
YTest  = Y(test(cv),:);

%% Step 3: Multi-label model training (one classifier per label using logistic regression)
models = {};
for i = 1:size(Y,2)
    models{i} = fitclinear(XTrain, YTrain(:,i), 'Learner', 'logistic');
end

%% Step 4: Model prediction
Y_pred = zeros(size(YTest));
for i = 1:length(models)
    Y_pred(:,i) = predict(models{i}, XTest);
end

%% Step 5: Evaluation
fprintf('\n=== One-hot Multi-class Evaluation (7 labels: M1~M7) ===\n');
for i = 1:size(Y,2)
    y_true = YTest(:,i);
    y_pred = Y_pred(:,i);
    acc = sum(y_true == y_pred) / length(y_true);
    fprintf('%s: Accuracy = %.2f\n', tag_names{i}, acc);
end
