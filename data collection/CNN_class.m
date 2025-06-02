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
idx = randperm(size(Data, 1)); % randomize them
Data = Data(idx, :);

% Drop unwanted columns (e.g., drop columns 1 and 3)
columns_to_drop = {'trial','cue_time'};  % <== modify as needed
Data(:, columns_to_drop) = [];

% Define the columns we want to separate
columns_to_separate = {'time_series', 'pressure_curve'};
SeriesData = Data(:, columns_to_separate); % Separate those columns into a new table

% Keep the rest of the data in the original table
Data(:, columns_to_separate) = [];

% Step C: Separate features (X) and labels (Y)
label_column = 'label';  % <-- Replace with your actual label field name
Y = Data.(label_column);     % This will be a 162×1 categorical or numeric vector
Y = categorical(Y);

Data(:, label_column) = [];  % Now Data only has features
X = table2array(Data);  % This creates the X matrix
X = normalize(X);

% Prepare the Series Data
timeSeries = SeriesData.time_series;      % Cell array: {1xN} sequences
pressureSeries = SeriesData.pressure_curve;   % Cell array: {1xN} sequences

% Pad the sequence
maxLen = max(cellfun(@length, [timeSeries; pressureSeries]));  % max length among all sequences in both columns
timeSeries_padded = cellfun(@(x) padarray(x, [0, maxLen - length(x)], 0, 'post'), timeSeries, 'UniformOutput', false);
pressureSeries_padded = cellfun(@(x) padarray(x, [0, maxLen - length(x)], 0, 'post'), pressureSeries, 'UniformOutput', false);

nSamples = numel(pressureSeries_padded);
sequenceData = zeros(2, maxLen, nSamples);  % Add 3rd dimension for batch

for i = 1:nSamples
    sequenceData(1,:,i) = timeSeries_padded{i};     % time
    sequenceData(2,:,i) = pressureSeries_padded{i}; % value
end

sequenceDataCNN = permute(sequenceData, [1, 2, 4, 3]);  % Shape: [2, maxLen, 1, nSamples]

%% Step 3: Init Network - Define layers

% CNN layer
seqInputSize = [2 maxLen];  % 2 rows (features), maxLen columns (time steps)

seqLayer = [
    imageInputLayer(seqInputSize, 'Name','sequence_input','Normalization','none')

    convolution2dLayer([2 5], 16, 'Stride', [1 1], 'Padding','same', 'Name','conv1')
    batchNormalizationLayer('Name','bn1')
    reluLayer('Name','relu1')

    maxPooling2dLayer([1 2], 'Stride', [1 2], 'Name','pool1')

    convolution2dLayer([1 5], 32, 'Padding','same', 'Name','conv2')
    batchNormalizationLayer('Name','bn2')
    reluLayer('Name','relu2')

    flattenLayer('Name','flatten')

    fullyConnectedLayer(7, 'Name','fc')
    softmaxLayer('Name','softmax')
    classificationLayer('Name','output')
];

%% Step 3: Train/test split
cv = cvpartition(size(X,1), 'HoldOut', 0.3);

XTrain = X(training(cv),:);
YTrain = Y(training(cv),:);
XTest  = X(test(cv),:);
YTest  = Y(test(cv),:);
seqTrain = sequenceDataCNN(:,:,:,training(cv));  % Keep same order
seqTest  = sequenceDataCNN(:,:,:,test(cv));

%% TRAIN

% Training options
options = trainingOptions('adam', ...
    'MaxEpochs', 50, ...
    'Shuffle','every-epoch', ...
    'Verbose',true, ...
    'Plots','training-progress');

fprintf("Size check: seqTrain=%d, XTrain=%d, YTrain=%d\n", size(seqTrain,3), size(XTrain,1), numel(YTrain));

% Train network
net = trainNetwork(seqTrain, YTrain, seqLayer, options);

%% Step 4: Model prediction
YPred = classify(net, seqTest);

%% Step 5: Evaluation
accuracy = mean(YPred == YTest);  % If you have true labels
fprintf("Accuracy: %.2f%%\n", accuracy * 100);
