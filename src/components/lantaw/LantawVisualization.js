"use client"
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import GeneralCard from '../cards/GeneralCard'

export default function LantawVisualization({ data }) {
  if (!data || !data.visualization) return null

  if (data.visualization === 'chart') {
    return <ChartRenderer config={data} />
  }

  if (data.visualization === 'table') {
    return <TableRenderer config={data} />
  }

  return null
}

function ChartRenderer({ config }) {
  const { type, title, description, chart_data, chart_config } = config

  // Prepare keys for Bar/Area
  let dataKeys = []
  if (chart_config) {
    dataKeys = Object.keys(chart_config)
  }

  return (
    <GeneralCard className="w-full max-w-2xl my-4">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" />
              {dataKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={chart_config[key]?.color || `hsl(var(--chart-${i+1}))`} radius={[4, 4, 0, 0]} name={chart_config[key]?.label || key} />
              ))}
            </BarChart>
          ) : type === 'area' ? (
            <AreaChart data={chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" />
              {dataKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={chart_config[key]?.color || `hsl(var(--chart-${i+1}))`} fillOpacity={0.2} fill={chart_config[key]?.color || `hsl(var(--chart-${i+1}))`} name={chart_config[key]?.label || key} />
              ))}
            </AreaChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" />
              <Pie
                data={chart_data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {chart_data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || `hsl(var(--chart-${(index % 5) + 1}))`} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">Unsupported chart type: {type}</div>
          )}
        </ResponsiveContainer>
      </div>
    </GeneralCard>
  )
}

function TableRenderer({ config }) {
  const { title, columns, rows } = config

  return (
    <GeneralCard className="w-full max-w-2xl my-4 overflow-hidden p-0">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-gray-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GeneralCard>
  )
}
