import React from "react";
import { useTheme } from "@mui/material";
import { TrendingUp as TrendingUpIcon } from "@mui/icons-material";
import { cn } from "../../lib/utils";
import { Card, CardContent } from "./card";

/**
 * A modern, minimalist stat card with trend indicator
 */
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  formatter = (val) => val, 
  suffix = "",
  trend, 
  trendValue,
  trendPeriod = 30,
  loading = false,
  className
}) => {
  const theme = useTheme();
  
  // Calculate actual change value if not provided
  const actualTrendValue = trendValue !== undefined ? trendValue : 
                         (trend !== null && trend !== undefined && value !== undefined) ? 
                         (value * trend / 100) : null;
  
  // Determine trend color
  const trendBgColor = trend > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
  const trendTextColor = trend > 0 ? '#10B981' : '#EF4444';
  
  return (
    <Card 
      className={cn(
        "h-full overflow-hidden transition-all duration-200 hover:shadow-md border-l-4",
        className
      )} 
      style={{ borderLeftColor: color }}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="text-sm text-gray-500 font-medium">{title}</div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}15`, color: color }}
          >
            <Icon fontSize="small" />
          </div>
        </div>
        
        <div className="text-2xl font-bold mb-4">
          {formatter(value)}{suffix}
        </div>
        
        {trend !== null && trend !== undefined ? (
          <div className="flex items-center mt-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
              style={{ backgroundColor: trendBgColor, color: trendTextColor }}
            >
              <TrendingUpIcon 
                sx={{ 
                  fontSize: 14,
                  transform: trend < 0 ? 'rotate(180deg)' : 'none'
                }} 
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span 
                className="text-xs font-semibold"
                style={{ color: trendTextColor }}
              >
                {trend > 0 ? '+' : ''}{trend}%
              </span>
              
              {actualTrendValue !== null && (
                <>
                  <span className="text-xs text-gray-400 mx-1">•</span>
                  <span className="text-xs text-gray-500 font-medium">
                    {(actualTrendValue > 0 ? '+' : '')}{formatter(Math.round(actualTrendValue))}{suffix}
                  </span>
                </>
              )}
              
              <span className="text-xs text-gray-400 ml-1">
                ({trendPeriod}d)
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic mt-2">
            Historiske data samles inn.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export { StatCard };