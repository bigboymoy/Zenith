import React, { useMemo, useState, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useApp } from '../App';
import { SPORTS } from '../lib/constants';
import { subDays, format, startOfDay, eachDayOfInterval } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Defer chart render until after mount so Chart.js does not block first paint.

const FILTERS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
];

export default function PerformanceChart() {
  const { activities } = useApp();
  const [activeFilter, setActiveFilter] = useState(30);
  const [activeSport, setActiveSport] = useState('all');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = useMemo(() => {
    const now = new Date();
    const start = subDays(now, activeFilter);
    const days = eachDayOfInterval({ start, end: now });

    const filtered = activities.filter(a => {
      const d = new Date(a.date);
      return d >= start && (activeSport === 'all' || a.sport === activeSport);
    });

    // Group by day
    const byDay = {};
    days.forEach(d => { byDay[startOfDay(d).getTime()] = 0; });

    filtered.forEach(a => {
      const key = startOfDay(new Date(a.date)).getTime();
      if (key in byDay) {
        if (a.sport === 'lift') {
          byDay[key] += (a.volume || 0) / 1000; // show in klbs
        } else {
          byDay[key] += (a.distance || 0);
        }
      }
    });

    const labels = days.map(d => {
      if (activeFilter <= 7) return format(d, 'EEE');
      if (activeFilter <= 30) return format(d, 'MMM d');
      return format(d, 'MMM d');
    });

    const values = days.map(d => byDay[startOfDay(d).getTime()] || 0);

    return { labels, values };
  }, [activities, activeFilter, activeSport]);

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#6b6b85' : '#8888a8';

  const data = {
    labels: chartData.labels,
    datasets: [{
      label: activeSport === 'lift' ? 'Volume (klbs)' : 'Distance (mi)',
      data: chartData.values,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.08)',
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#6366f1',
      pointBorderColor: 'transparent',
      tension: 0.4,
      fill: true,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1e1e2a' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        titleColor: isDark ? '#f1f1f5' : '#111118',
        bodyColor: isDark ? '#a0a0b8' : '#4a4a6a',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: ctx => {
            const val = ctx.parsed.y;
            if (val === 0) return 'Rest day';
            if (activeSport === 'lift') return `${val.toFixed(1)}k lbs volume`;
            return `${val.toFixed(1)} mi`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColor, drawBorder: false },
        ticks: { color: textColor, font: { size: 11 }, maxTicksLimit: activeFilter <= 7 ? 7 : 10 },
        border: { display: false },
      },
      y: {
        grid: { color: gridColor, drawBorder: false },
        ticks: { color: textColor, font: { size: 11 } },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  if (!mounted) {
    return (
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">Performance Over Time</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>Loading chart…</div>
          </div>
        </div>
        <div className="chart-container" style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
          <span aria-hidden="true">📈</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Performance Over Time</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
            {activeSport === 'lift' ? 'Volume (klbs)' : 'Distance (miles)'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sport filter */}
          <div className="chart-filters">
            <button
              className={`filter-btn ${activeSport === 'all' ? 'active' : ''}`}
              onClick={() => setActiveSport('all')}
            >All</button>
            {Object.entries(SPORTS).map(([key, s]) => (
              <button
                key={key}
                className={`filter-btn ${activeSport === key ? 'active' : ''}`}
                onClick={() => setActiveSport(key)}
              >{s.icon}</button>
            ))}
          </div>
          {/* Time filter */}
          <div className="chart-filters">
            {FILTERS.map(f => (
              <button
                key={f.days}
                className={`filter-btn ${activeFilter === f.days ? 'active' : ''}`}
                onClick={() => setActiveFilter(f.days)}
              >{f.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-container">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
