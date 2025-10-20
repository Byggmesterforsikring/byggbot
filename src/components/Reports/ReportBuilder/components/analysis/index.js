// Analysis plugin registry
import { topMoversPlugin } from './plugins/topMovers';
import { changeRatesPlugin } from './plugins/changeRates';
import { paretoPlugin } from './plugins/pareto';
import { seasonalOverlayPlugin } from './plugins/seasonalOverlay';
import { stackedContributionPlugin } from './plugins/stackedContribution';
import { waterfallPlugin } from './plugins/waterfall';
import { anomalyDetectionPlugin } from './plugins/anomalyDetection';
import { confidenceBandsPlugin } from './plugins/confidenceBands';
import { smallMultiplesPlugin } from './plugins/smallMultiples';
import { correlationMatrixPlugin } from './plugins/correlationMatrix';
import { clusteringPlugin } from './plugins/clustering';
import { cohortAnalysisPlugin } from './plugins/cohortAnalysis';
import { skadeprosentPlugin } from './plugins/skadeprosent';


// All available analysis plugins
export const analysisPlugins = [
    topMoversPlugin,
    changeRatesPlugin,
    paretoPlugin,
    seasonalOverlayPlugin,
    stackedContributionPlugin,
    waterfallPlugin,
    anomalyDetectionPlugin,
    confidenceBandsPlugin,
    smallMultiplesPlugin,
    correlationMatrixPlugin,
    clusteringPlugin,
    cohortAnalysisPlugin,
    skadeprosentPlugin
];

/**
 * Get available analysis plugins based on data characteristics
 * @param {Array} data - The dataset to analyze
 * @param {Array} dataB - Optional comparison dataset
 * @param {boolean} hasCompare - Whether we have comparison data
 * @param {string} reportType - Type of report (e.g., 'skade', 'garanti', 'nysalg')
 * @param {Object} chartLabels - Chart configuration labels
 * @returns {Array} Available analysis plugins
 */
export const getAvailableAnalyses = (data, dataB, hasCompare, reportType, chartLabels) => {
    if (!data || data.length === 0) return [];

    return analysisPlugins.filter(plugin => {
        try {
            return plugin.isAvailable(data, dataB, hasCompare, reportType, chartLabels);
        } catch (error) {
            console.warn(`Error checking availability for ${plugin.id}:`, error);
            return false;
        }
    });
};

/**
 * Execute an analysis plugin
 * @param {string} pluginId - ID of the plugin to execute
 * @param {Object} params - Parameters for the analysis
 * @returns {Object} Analysis result
 */
export const executeAnalysis = (pluginId, params) => {
    const plugin = analysisPlugins.find(p => p.id === pluginId);
    if (!plugin) {
        throw new Error(`Analysis plugin '${pluginId}' not found`);
    }

    try {
        return plugin.execute(params);
    } catch (error) {
        console.error(`Error executing analysis '${pluginId}':`, error);
        throw error;
    }
};
