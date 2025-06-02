%% Step 1: Load and merge multiple data files using real labels
clear; clc;

file_pattern = fullfile(pwd, 'press_data_*.mat');
files = dir(file_pattern);

X = [];
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

% Convert label strings to numeric class labels
unique_labels = {'M1','M2','M3','M4','M5','M6','M7'};  % M1 = Normal
num_classes = numel(unique_labels);
Y = zeros(length(label_strs), 1);  % Integer label vector

for i = 1:length(label_strs)
    Y(i) = find(strcmp(unique_labels, label_strs{i}));
end

feature_names = {'Delay','Duration','MaxForce','StdForce','NumPeaks'};
tag_names = unique_labels;

%% Step 2: Train/test split
cv = cvpartition(size(X,1), 'HoldOut', 0.3);
XTrain = X(training(cv),:);
YTrain = Y(training(cv));
XTest  = X(test(cv),:);
YTest  = Y(test(cv));

%% Step 3: Multi-class model training (ECOC + logistic regression)
template = templateLinear('Learner', 'logistic');
model = fitcensemble(XTrain, YTrain, 'Method', 'Bag');
save('trained_model_Y.mat', 'model', 'tag_names', 'feature_names');

%% Step 4: Model prediction
Y_pred = predict(model, XTest);
%% Step 5: Evaluation
fprintf('\n=== Multi-class Evaluation (M1~M7) ===\n');

% Overall accuracy
accuracy = sum(Y_pred == YTest) / length(YTest);
fprintf('Overall Accuracy = %.2f\n', accuracy);

% Per-class accuracy
for i = 1:num_classes
    idx = (YTest == i);
    acc_i = sum(Y_pred(idx) == i) / sum(idx);
    fprintf('%s: Accuracy = %.2f\n', tag_names{i}, acc_i);
end

% Optional: Plot confusion matrix
figure;
confusionchart(YTest, Y_pred, 'RowSummary','row-normalized', ...
    'ColumnSummary','column-normalized', 'XLabel','Predicted', 'YLabel','True', ...
    'Title','Confusion Matrix');
