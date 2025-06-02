%% Step 1: Load trained model
load('trained_model_Y.mat');  % Contains: model, tag_names, feature_names

%% Step 2: Load test data with multiple trials
test_file = 'test_data.mat';  % Replace with your test file
loaded = load(test_file);
Data = loaded.Data;

n_trials = length(Data);
fprintf('Loaded %d test trials from %s\n', n_trials, test_file);

%% Step 3: Loop through each trial and predict
for i = 1:n_trials
    d = Data(i);

    % Extract features
    delay = d.delay;
    duration = d.duration;
    max_force = d.max_force;
    curve = d.pressure_curve;
    std_force = std(curve);
    num_peaks = numel(findpeaks(curve));
    x_test = [delay, duration, max_force, std_force, num_peaks];

    % Predict using the multi-class model
    [pred_class, score] = predict(model, x_test);

    % Display result
    fprintf('\n--- Trial %d ---\n', i);
    fprintf('Predicted Label: %s\n', tag_names{pred_class});

    % Optional: show class scores (posterior probabilities or raw scores)
    fprintf('Scores: ');
    for j = 1:length(tag_names)
        fprintf('%s: %.2f  ', tag_names{j}, score(j));
    end
    fprintf('\n');
end
