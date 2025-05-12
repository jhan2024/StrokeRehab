%% Step 1: Load trained multi-label model
load('multi_label_model.mat');  % Contains: models, tag_names, feature_names, threshold

%% Step 2: Load test data
test_file = 'test_data.mat';  % <-- 替换为你的测试数据文件
loaded = load(test_file);
Data = loaded.Data;

n_trials = length(Data);
fprintf('Loaded %d test trials from %s\n', n_trials, test_file);

%% Step 3: Loop through trials and predict
for i = 1:n_trials
    d = Data(i);
    curve = d.pressure_curve;

    % 提取一致的特征（必须与训练阶段相同）
    std_force = std(curve);
    num_peaks = numel(findpeaks(curve));
%     d_curve = diff(curve);
%     mean_diff = mean(d_curve);
%     std_diff = std(d_curve);
%     rms_diff = rms(d_curve);
%     zero_crossings = sum(abs(diff(sign(d_curve))) > 0);

    x_test = [d.delay, d.duration, d.max_force, std_force, num_peaks];

    % 初始化预测结果
    y_pred = zeros(1, numel(tag_names));
    score_pred = zeros(1, numel(tag_names));

    % 逐标签预测
    for j = 1:numel(tag_names)
        [~, score] = predict(models{j}, x_test);
        score_pred(j) = score(2);  % 概率 / 正类得分
        y_pred(j) = score(2) > threshold;  % 使用阈值判定标签
    end

    % 输出结果
    fprintf('\n--- Trial %d ---\n', i);
    has_label = false;
    for j = 1:numel(tag_names)
        if y_pred(j) == 1
            fprintf('Predicted: %s (Score = %.2f)\n', tag_names{j}, score_pred(j));
            has_label = true;
        end
    end
    if ~has_label
        fprintf('No label predicted above threshold %.2f.\n', threshold);
    end

    fprintf('Scores: ');
    for j = 1:numel(tag_names)
        fprintf('%s: %.2f  ', tag_names{j}, score_pred(j));
    end
    fprintf('\n');
end
