%% Step 1: Load and merge data
clear; clc;

file_list = dir(fullfile(pwd, 'press_data_*.mat'));
X = [];
label_strs = {};

for f = 1:length(file_list)
    filepath = fullfile(pwd, file_list(f).name);
    loaded = load(filepath);
    
    if isfield(loaded, 'Data')
        Data = loaded.Data;
        for i = 1:length(Data)
            d = Data(i);
            curve = d.pressure_curve;
            std_force = std(curve);
            num_peaks = numel(findpeaks(curve));

            % 增强特征
%             d_curve = diff(curve);
%             mean_diff = mean(d_curve);
%             std_diff = std(d_curve);
%             rms_diff = rms(d_curve);
%             zero_crossings = sum(abs(diff(sign(d_curve))) > 0);

            x_i = [d.delay, d.duration, d.max_force, std_force, num_peaks];

            X = [X; x_i];
            label_strs{end+1} = d.label;
        end
    else
        warning('No "Data" variable in %s', file_list(f).name);
    end
end

feature_names = {'Delay','Duration','MaxForce','StdForce','NumPeaks'};
tag_names = {'M1','M2','M3','M4','M5','M6','M7'};
num_classes = numel(tag_names);

%% Step 2: Convert labels to multi-label format
Y = zeros(length(label_strs), num_classes);
for i = 1:length(label_strs)
    idx = strcmp(tag_names, label_strs{i});
    Y(i, idx) = 1;
end

%% Step 3: Train/test split
cv = cvpartition(size(X,1), 'HoldOut', 0.3);
XTrain = X(training(cv),:);
YTrain = Y(training(cv),:);
XTest  = X(test(cv),:);
YTest  = Y(test(cv),:);

%% Step 4: Train one classifier per label (with class balancing)
models = cell(1, num_classes);
%% Step 4: Train one classifier per label using Random Forest
models = cell(1, num_classes);
for i = 1:num_classes
    % 样本权重（应对类别不平衡）
    pos_weight = sum(YTrain(:,i)==0) / sum(YTrain(:,i)==1);
    sample_weights = YTrain(:,i) * pos_weight + (1 - YTrain(:,i));
    
    models{i} = fitcensemble(XTrain, YTrain(:,i), ...
        'Method', 'Bag', 'NumLearningCycles', 100, ...
        'Weights', sample_weights);
end

%% Step 5: Predict (with custom threshold)
Y_pred = zeros(size(YTest));
scores = zeros(size(YTest));
threshold = 0.3;  % 自定义阈值

for i = 1:num_classes
    [~, score] = predict(models{i}, XTest);
    scores(:,i) = score(:,2);  % 正类分数
    Y_pred(:,i) = score(:,2) > threshold;
end

%% Step 6: Evaluate
fprintf('\n=== Multi-label Accuracy per Label ===\n');
for i = 1:num_classes
    acc = sum(Y_pred(:,i) == YTest(:,i)) / size(YTest,1);
    fprintf('%s: Accuracy = %.2f\n', tag_names{i}, acc);
end

%% Step 7: Save model
save('multi_label_model.mat', 'models', 'tag_names', 'feature_names', 'threshold');
fprintf('\nSaved to multi_label_model.mat\n');
