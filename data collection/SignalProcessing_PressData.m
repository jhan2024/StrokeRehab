%% 读取数据
data = load('press.csv');
press = data(:);  % 保证是列向量
figure;
plot(press);
title('原始信号（初步查看）');
xlabel('采样点');
ylabel('气压');

%% 参数设置
fs = 10;       % 采样率 10Hz
fh = 0.05;     % 高通滤波截止频率 0.05Hz
order = 4;     % 高通滤波器阶数

%% Step 1：原始信号展示
figure;
subplot(3,1,1);
plot(press, 'b');
title('原始信号');
xlabel('采样点');
ylabel('气压');
grid on;

%% Step 2：高通滤波去漂移
[b, a] = butter(order, fh/(fs/2), 'high');  
press_filtered = filtfilt(b, a, press);

subplot(3,1,2);
plot(press_filtered, 'r');
title('高通滤波后信号（去漂移）');
xlabel('采样点');
ylabel('气压');
grid on;

%% Step 3：处理持续按压中的漏气趋势（线性拟合补偿版）
threshold = mean(press_filtered) + std(press_filtered);  % 动态阈值
pressing_idx = find(press_filtered > threshold);         % 找到按压期间索引

% 防止出错
if ~isempty(pressing_idx)
    % 对按压区间做线性拟合
    p = polyfit(pressing_idx, press_filtered(pressing_idx), 1);  % 线性拟合
    trend = polyval(p, pressing_idx);  % 生成趋势线

    % 补偿趋势：让按压段变成水平
    press_corrected = press_filtered;
    press_corrected(pressing_idx) = press_filtered(pressing_idx) - (trend - mean(trend));
else
    press_corrected = press_filtered;
    disp('⚡ 提示：未检测到明显的持续按压区间');
end

%% Step 4：画补偿后的信号
subplot(3,1,3);
plot(press_corrected, 'g');
title('去除漏气后的信号');
xlabel('采样点');
ylabel('气压');
grid on;

%% 结束
disp('✅ 完成：数据读取 + 高通滤波 + 漏气补偿！');
