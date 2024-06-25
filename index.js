require('dotenv').config();
const axios = require('axios');
const { WebClient } = require('@slack/web-api');

const slackToken = process.env.SLACK_BOT_TOKEN;
const slackChannel = process.env.SLACK_CHANNEL;


 

const locations = [
    { zip: 'Phoenix', lat: 33.6706, lon: -112.2236 },
    { zip: 'Chicago', lat:41.926575, lon: -87.648356 },
    { zip: 'Connecticut', lat: 41.634903, lon: -72.757554 }
  ];
  
  // Initialize Slack client
  const slack = new WebClient(slackToken);
  
  function getWeatherCode(code) {
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
      85: 'Slight snow showers', 86: 'Heavy snow showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[code] || 'Unknown';
  }
  
  async function getWeatherData(location) {
    try {
      const response = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
        params: {
          latitude: location.lat,
          longitude: location.lon,
          daily: 'temperature_2m_max,temperature_2m_min,weathercode',
          hourly: 'dewpoint_2m',
          temperature_unit: 'fahrenheit',
          windspeed_unit: 'mph',
          precipitation_unit: 'inch',
          timezone: 'auto',
          forecast_days: 1
        }
      });
      
      const data = response.data;
      const dewpoints = data.hourly.dewpoint_2m;
      const highDewpoint = Math.max(...dewpoints).toFixed(2);
      const lowDewpoint = Math.min(...dewpoints).toFixed(2);
      const highTemp = data.daily.temperature_2m_max[0].toFixed(2);
      const lowTemp = data.daily.temperature_2m_min[0].toFixed(2);
      const weatherStatus = getWeatherCode(data.daily.weathercode[0]);
      
      return {
        zipCode: location.zip,
        highDewpoint,
        lowDewpoint,
        highTemp,
        lowTemp,
        weatherStatus
      };
    } catch (error) {
      console.error(`Error fetching data for ${location.zip}:`, error.message);
      return { zipCode: location.zip, error: 'Failed to fetch data' };
    }
  }
  
  async function postToSlack(message) {
    try {
        console.log(message)
      await slack.chat.postMessage({
        channel: slackChannel,
        text: message,
      });
      console.log('Message posted to Slack successfully');
    } catch (error) {
      console.error('Error posting to Slack:', error.message);
    }
  }
  
  async function main() {
    const results = await Promise.all(locations.map(getWeatherData));
    
    const message = results.map(result => {
      if (result.error) {
        return `${result.zipCode}: Error - ${result.error}`;
      }
      return `Weather for ${result.zipCode}:
  - High/Low Temp: ${result.highTemp}°F / ${result.lowTemp}°F
  - High/Low Dewpoint: ${result.highDewpoint}°F / ${result.lowDewpoint}°F
  - Weather: ${result.weatherStatus}`;
    }).join('\n\n');
  
    await postToSlack(message);
  }
  
  main();