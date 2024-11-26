//@ts-nocheck
import React from 'react';
import { ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { Styles } from '../../common';
import { NoContent } from 'UI';
import { filtersMap } from 'Types/filter/newFilter';
import { numberWithCommas } from 'App/utils';
interface Props {
  metric: any;
  data: any;
  colors: any;
  onClick?: (filters) => void;
}

function CustomMetricPieChart(props: Props) {
  const { metric, data, onClick = () => null } = props;

  const onClickHandler = (event) => {
    if (event && !event.payload.group) {
      const filters = Array<any>();
      let filter = { ...filtersMap[metric.metricOf] };
      filter.value = [event.payload.name];
      filter.type = filter.key;
      delete filter.key;
      delete filter.operatorOptions;
      delete filter.category;
      delete filter.icon;
      delete filter.label;
      delete filter.options;

      filters.push(filter);
      onClick(filters);
    }
  };

    const getTotalForSeries = (series: string) => {
        return data.chart ? data.chart.reduce((acc, curr) => acc + curr[series], 0) : 0
    }
    const values = data.namesMap.map((k, i) => {
        return {
            name: k,
            value: getTotalForSeries(k)
        }
    })
    const highest = values.reduce(
      (acc, curr) =>
        acc.value > curr.value ? acc : curr,
      { name: '', value: 0 });
  return (
    <NoContent
      size="small"
      title="No data available"
      show={!data.chart || data.chart.length === 0}
      style={{ minHeight: '240px' }}
    >
      <ResponsiveContainer height={240} width="100%">
        <PieChart>
        <Legend iconType={'circle'} wrapperStyle={{ top: -26 }} />
          <Pie
            isAnimationActive={false}
            data={values}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            // fill={colors[0]}
            activeIndex={1}
            onClick={onClickHandler}
            labelLine={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              value,
            }) => {
              const RADIAN = Math.PI / 180;
              let radius1 = 15 + innerRadius + (outerRadius - innerRadius);
              let radius2 = innerRadius + (outerRadius - innerRadius);
              let x2 = cx + radius1 * Math.cos(-midAngle * RADIAN);
              let y2 = cy + radius1 * Math.sin(-midAngle * RADIAN);
              let x1 = cx + radius2 * Math.cos(-midAngle * RADIAN);
              let y1 = cy + radius2 * Math.sin(-midAngle * RADIAN);

              const percentage =
                (value * 100) /
                highest.value;

              if (percentage < 3) {
                return null;
              }

              return (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#3EAAAF"
                  strokeWidth={1}
                />
              );
            }}
            label={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              value,
              index,
            }) => {
              const RADIAN = Math.PI / 180;
              let radius = 20 + innerRadius + (outerRadius - innerRadius);
              let x = cx + radius * Math.cos(-midAngle * RADIAN);
              let y = cy + radius * Math.sin(-midAngle * RADIAN);
              const percentage =
                (value / highest.value) *
                100;
              let name = values[index].name || 'Unidentified';
              name = name.length > 20 ? name.substring(0, 20) + '...' : name;
              if (percentage < 3) {
                return null;
              }
              return (
                <text
                  x={x}
                  y={y}
                  fontWeight="400"
                  fontSize="12px"
                  // fontFamily="'Source Sans Pro', 'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'"
                  textAnchor={x > cx ? 'start' : 'end'}
                  dominantBaseline="central"
                  fill="#666"
                >
                  {numberWithCommas(value)}
                </text>
              );
            }}
          >
            {values && values.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={Styles.colorsPie[index % Styles.colorsPie.length]}
                />
              ))}
          </Pie>
          <Tooltip {...Styles.tooltip} />
        </PieChart>
      </ResponsiveContainer>
    </NoContent>
  );
}

export default CustomMetricPieChart;
