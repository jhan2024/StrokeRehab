%% Step 1: Load and merge multiple data files using real labels
clear; clc;

data_folder = 'Data';  % <-- change to your actual folder path
file_list = dir(fullfile(data_folder, '*.mat'));

Data = [];  % Combined Data array

for k = 1:length(file_list)
    file_path = fullfile(data_folder, file_list(k).name);
    S = load(file_path);
    
    if isfield(S, 'Data')
        Data = [Data; S.Data(:)];  % ensure column vector and concatenate
    else
        warning('No "Data" variable found in %s', file_list(k).name);
    end
end

%% Step 2: Pre-Processing

Data = struct2table(Data);  % T is now a 162×10 table

idx = randperm(size(Data, 1));
Data = Data(idx, :);

% Drop unwanted columns (e.g., drop columns 1 and 3)
columns_to_drop = {'trial','cue_time', 'time_series', 'pressure_curve'};  % <== modify as needed
Data(:, columns_to_drop) = [];

% Step C: Separate features (X) and labels (Y)
% Assume the last N columns are the multi-labels (e.g., last 5 columns)
label_column = 'label';  % <-- Replace with your actual label field name
Y = Data.(label_column);     % This will be a 162×1 categorical or numeric vector
Y = str2double(erase(Y, 'M'));

Data(:, label_column) = [];  % Now Data only has features
X = table2array(Data);  % This creates the X matrix

%% Step 3: Train/test split
cv = cvpartition(size(X,1), 'HoldOut', 0.3);
XTrain = X(training(cv),:);
YTrain = Y(training(cv),:);
XTest  = X(test(cv),:);
YTest  = Y(test(cv),:);

%% Step 3: Multi-label model training (simple logistic regression per label)
model = fitcecoc(XTrain, YTrain, 'Learner', 'tree');

%% Step 4: Model prediction
YPred = predict(model, XTest);

%% Step 5: Evaluation
accuracy = sum(YPred == YTest) / length(YTest);
fprintf('Accuracy: %.2f%%\n', accuracy * 100);
