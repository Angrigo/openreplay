import React from 'react';
import CustomTooltip from "./CustomChartTooltip";
import { Styles } from '../common';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  Rectangle,
} from 'recharts';

interface Props {
  data: any;
  params: any;
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
}
const getPath = (x, y, width, height) => {
  const radius = Math.min(width / 2, height / 2);
  return `
    M${x + radius},${y}
    H${x + width - radius}
    A${radius},${radius} 0 0 1 ${x + width},${y + radius}
    V${y + height - radius}
    A${radius},${radius} 0 0 1 ${x + width - radius},${y + height}
    H${x + radius}
    A${radius},${radius} 0 0 1 ${x},${y + height - radius}
    V${y + radius}
    A${radius},${radius} 0 0 1 ${x + radius},${y}
    Z
  `;
};

const PillBar = (props) => {
  const { fill, x, y, width, height } = props;

  return <path d={getPath(x, y, width, height)} stroke="none" fill={fill} />;
};


function CustomMetricLineChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    params,
    colors,
    onClick = () => null,
    yaxis = { ...Styles.yaxis },
    label = 'Number of Sessions',
    hideLegend = false,
  } = props;

  return (
    <ResponsiveContainer height={240} width="100%">
      <BarChart
        data={data.chart}
        margin={Styles.chartMargins}
        onClick={onClick}
      >
        {!hideLegend && (
          <Legend iconType={'circle'} wrapperStyle={{ top: -26 }} />
        )}
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#EEEEEE"
        />
        <XAxis {...Styles.xaxis} dataKey="time" interval={params.density / 7} />
        <YAxis
          {...yaxis}
          allowDecimals={false}
          tickFormatter={(val) => Styles.tickFormatter(val)}
          label={{
            ...Styles.axisLabelLeft,
            value: label || 'Number of Sessions',
          }}
        />
        <Tooltip {...Styles.tooltip} content={CustomTooltip} />
        {Array.isArray(data.namesMap) &&
         data.namesMap.map((key, index) => (
           <Bar
             key={key}
             name={key}
             type="monotone"
             dataKey={key}
             shape={<PillBar />}
             fill={colors[index]}
             legendType={key === 'Total' ? 'none' : 'line'}
             activeBar={<PillBar fill={colors[index]} stroke={colors[index]} />}
             // strokeDasharray={'4 3'} FOR COPMARISON ONLY
           />
         ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default CustomMetricLineChart;
