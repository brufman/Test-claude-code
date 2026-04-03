import numpy as np
import pandas as pd
from collections import Counter
import matplotlib.pyplot as plt

# Set the number of experiments
num_experiments = 10000

# Define the possible outcomes (starting from 6 and going up)
possible_outcomes = list(range(6, 18))  # This creates a list from 6 to 17 (12 elements)

# Adjust probabilities to get an expected value closer to 14.7
probabilities = [0.01, 0.01, 0.02, 0.02, 0.03, 0.04, 0.05, 0.07, 0.10, 0.15, 0.25, 0.25]

# Run the experiments with the adjusted probabilities
results = np.random.choice(possible_outcomes, size=num_experiments, p=probabilities)

# Create a frequency table
all_counts = {outcome: 0 for outcome in possible_outcomes}
observed_counts = Counter(results)
all_counts.update(observed_counts)

frequency_table = pd.DataFrame(all_counts.items(), columns=['x', 'Frequency'])
frequency_table['Relative Frequency'] = frequency_table['Frequency'] / num_experiments

# Calculate average directly from the frequency table
average_from_freq = sum(row['x'] * row['Frequency'] for _, row in frequency_table.iterrows()) / num_experiments
std_dev = np.std(results)

# Display the summary frequency table
print(f"Summary of {num_experiments} experiments:")
print(frequency_table)

# Display average and standard deviation
print(f"\nAverage (Mean) of x calculated from frequency table: {average_from_freq:.4f}")
print(f"Standard Deviation of x: {std_dev:.4f}")
print(f"Difference from expected 14.7: {abs(average_from_freq - 14.7):.4f}")

# Create a bar chart of the frequencies
plt.figure(figsize=(12, 6))
plt.bar(frequency_table['x'], frequency_table['Frequency'])
plt.xlabel('x')
plt.ylabel('Frequency')
plt.title(f'Frequency Distribution of {num_experiments} Experiments\nMean of x: {average_from_freq:.4f}, Std Dev of x: {std_dev:.4f}')
plt.xticks(frequency_table['x'])
plt.grid(axis='y', linestyle='--', alpha=0.7)

# Add vertical lines for the mean and expected value
plt.axvline(x=average_from_freq, color='r', linestyle='--', label=f'Observed Mean = {average_from_freq:.4f}')
plt.axvline(x=14.7, color='g', linestyle='--', label=f'Target Expected = 14.7')
plt.legend()

plt.savefig('/home/user/Test-claude-code/frequency_distribution.png', dpi=150, bbox_inches='tight')
print("\nChart saved to frequency_distribution.png")
