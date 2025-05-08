%% Step 1: Load data
clear; clc;

load('press_data_M1_153245.mat');  % 改成你的实际文件名

% 初始化特征矩阵和标签
X = [];  % 特征矩阵
Y = [];  % 多标签布尔矩阵

% 阈值设定（可根据数据微调）
delay_thresh = 1.5;       % >1.5s = Delayed
short_thresh = 0.3;       % <0.3s = TooShort
long_thresh = 2.0;        % >2.0s = TooLong
weak_thresh = 104000;     % <X = TooWeak
strong_thresh = 112000;   % >X = TooStrong
jitter_thresh = 1000;     % std > X = Jittery（需调）

for i = 1:length(Data)
    % 特征提取
    delay = Data(i).delay;
    duration = Data(i).duration;
    max_force = Data(i).max_force;
    std_force = std(Data(i).pressure_curve);
    
    x_i = [delay, duration, max_force, std_force];
    X = [X; x_i];
    
    % 多标签打标（6标签：Delay, Short, Long, Weak, Strong, Jittery）
    tags = zeros(1,6);
    if delay > delay_thresh, tags(1) = 1; end
    if duration < short_thresh, tags(2) = 1; end
    if duration > long_thresh, tags(3) = 1; end
    if max_force < weak_thresh, tags(4) = 1; end
    if max_force > strong_thresh, tags(5) = 1; end
    if std_force > jitter_thresh, tags(6) = 1; end

    Y = [Y; tags];
end

feature_names = {'Delay','Duration','MaxForce','StdForce'};
tag_names = {'Delayed','TooShort','TooLong','TooWeak','TooStrong','Jittery'};

%% Step 2: 训练/测试拆分
cv = cvpartition(size(X,1), 'HoldOut', 0.3);
XTrain = X(training(cv),:);
YTrain = Y(training(cv),:);
XTest  = X(test(cv),:);
YTest  = Y(test(cv),:);

%% Step 3: 多标签模型训练（简单逻辑回归逐标签）
models = {};
for i = 1:size(Y,2)
    models{i} = fitclinear(XTrain, YTrain(:,i), 'Learner', 'logistic');
end

%% Step 4: 模型预测
Y_pred = zeros(size(YTest));
for i = 1:length(models)
    Y_pred(:,i) = predict(models{i}, XTest);
end

%% Step 5: 评估
fprintf('\n=== Multi-label Evaluation ===\n');
for i = 1:size(Y,2)
    y_true = YTest(:,i);
    y_pred = Y_pred(:,i);
    acc = sum(y_true == y_pred) / length(y_true);
    fprintf('%s: Accuracy = %.2f\n', tag_names{i}, acc);
end
