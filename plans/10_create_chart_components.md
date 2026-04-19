# Plan: Create Chart Components

## Overview
Build chart components using Recharts for data visualization.

## Tasks

### 1. Create src/components/charts/WeightChart.tsx
- Props: data (array of {date, weight}), range (7d/30d/90d), showStatistics
- Line chart using Recharts LineChart
- X-axis: dates
- Y-axis: weight (kg)
- Current weight indicator
- Trend line
- 7-day, 30-day, 90-day range selector
- Responsive container
- Minimum height: 200px

### 2. Create src/components/charts/MacroChart.tsx
- Props: protein, carbs, fat, goal (optional)
- Pie chart using Recharts PieChart
- Segments: protein, carbs, fat
- Legend with grams
- Goal comparison overlay (optional)
- Responsive container
- Color coding (protein: blue, carbs: green, fat: yellow)

### 3. Create src/components/charts/CaloriesChart.tsx
- Props: dailyData (array of {date, consumed, goal}), currentDayData
- Area chart for current day using Recharts AreaChart
- Bar chart for 7-day view using Recharts BarChart
- Goal line indicator
- Responsive container
- Current day: consumed vs goal bars
- 7-day: daily consumption bars

### 4. Create src/components/charts/index.ts
- Export all chart components
- Create unified import

## Expected Outcome
- Weight trend line chart
- Macro distribution pie chart
- Calories consumption chart
- Responsive chart containers
- Range selectors where needed

## Notes
- Use Recharts responsive container
- Set appropriate chart heights
- Use consistent color palette
- Add tooltips for interactivity
- Test on mobile (touch interactions)
- Consider performance for large datasets