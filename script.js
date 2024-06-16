document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');

    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                const csvData = parseCSV(text);
                const lastHourData = getLastHourData(csvData);
                updateCurrentValues(csvData); // Update with the latest data
                updateMinMaxValues(lastHourData); // Update min/max values for the last hour
                updateStatusTexts(csvData); // Update status texts
                localStorage.setItem('csvData', text); // Store CSV data in localStorage
            };
            reader.readAsText(file, 'ISO-8859-1');
        }
    });

    function parseCSV(text) {
        const rows = text.trim().split('\n').map(row => row.split(';'));
        const headers = rows.shift();
        return rows.map(row => Object.fromEntries(row.map((val, i) => [headers[i].trim(), val.trim()])));
    }

    function getLastHourData(data) {
        const latestEntry = data[data.length - 1];
        const latestDate = moment(latestEntry['Date and time'], 'DD/MM/YYYY HH:mm:ss');
        const cutoffTime = latestDate.subtract(1, 'hours');

        return data.filter(row => {
            const dateTime = moment(row['Date and time'], 'DD/MM/YYYY HH:mm:ss');
            return dateTime.isSameOrAfter(cutoffTime);
        });
    }

    function updateCurrentValues(data) {
        const latestData = data[data.length - 1];
        const co2 = parseFloat(latestData['CO2 ppm']) || 'N/A';
        const temperature = parseFloat(latestData['Temperature Â°C']) || 'N/A';
        const humidity = parseFloat(latestData['RH %']) || 'N/A';
        
        // Update text values
        document.getElementById('current-co2').innerText = co2;
        document.getElementById('current-temperature').innerText = temperature;
        document.getElementById('current-humidity').innerText = humidity;
        
        // Update input range values
        document.getElementById('co2').value = co2;
        document.getElementById('temperature').value = temperature;
        document.getElementById('humidity').value = humidity;
        
        // Update value labels
        document.getElementById('co2-value').innerText = co2;
        document.getElementById('temperature-value').innerText = temperature;
        document.getElementById('humidity-value').innerText = humidity;

        // Calculate and update score
        const score = calculateScore(co2, temperature, humidity);
        gauge.refresh(score);
    }

    function updateMinMaxValues(data) {
        if (data.length === 0) {
            document.getElementById('min-co2').innerText = 'N/A';
            document.getElementById('max-co2').innerText = 'N/A';
            document.getElementById('min-temperature').innerText = 'N/A';
            document.getElementById('max-temperature').innerText = 'N/A';
            document.getElementById('min-humidity').innerText = 'N/A';
            document.getElementById('max-humidity').innerText = 'N/A';
            return;
        }

        const co2Values = data.map(row => parseFloat(row['CO2 ppm'])).filter(val => !isNaN(val));
        const temperatureValues = data.map(row => parseFloat(row['Temperature Â°C'])).filter(val => !isNaN(val));
        const humidityValues = data.map(row => parseFloat(row['RH %'])).filter(val => !isNaN(val));

        const minCo2 = Math.min(...co2Values);
        const maxCo2 = Math.max(...co2Values);
        const minTemperature = Math.min(...temperatureValues);
        const maxTemperature = Math.max(...temperatureValues);
        const minHumidity = Math.min(...humidityValues);
        const maxHumidity = Math.max(...humidityValues);

        document.getElementById('min-co2').innerText = co2Values.length ? minCo2 : 'N/A';
        document.getElementById('max-co2').innerText = co2Values.length ? maxCo2 : 'N/A';
        document.getElementById('min-temperature').innerText = temperatureValues.length ? minTemperature : 'N/A';
        document.getElementById('max-temperature').innerText = temperatureValues.length ? maxTemperature : 'N/A';
        document.getElementById('min-humidity').innerText = humidityValues.length ? minHumidity : 'N/A';
        document.getElementById('max-humidity').innerText = humidityValues.length ? maxHumidity : 'N/A';
    }

    function updateStatusTexts(data) {
        const latestData = data[data.length - 1];
        const co2 = parseFloat(latestData['CO2 ppm']) || 'N/A';
        const temperature = parseFloat(latestData['Temperature Â°C']) || 'N/A';
        const humidity = parseFloat(latestData['RH %']) || 'N/A';

        // Update status text for temperature
        if (temperature === 'N/A') {
            document.getElementById('status-text-temperature').innerHTML = 'Temperatūros duomenų nėra.';
        } else if (temperature >= 22 && temperature <= 24) {
            document.getElementById('status-text-temperature').innerHTML = 'Temperatūra yra optimali.';
        } else if (temperature < 22) {
            document.getElementById('status-text-temperature').innerHTML = `Temperatūra yra ${22 - temperature}°C žemesnė nei optimali.`;
        } else {
            document.getElementById('status-text-temperature').innerHTML = `Temperatūra yra ${temperature - 24}°C aukštesnė nei optimali.`;
        }

        // Update status text for CO2
        if (co2 === 'N/A') {
            document.getElementById('status-text-co2').innerHTML = 'CO2 duomenų nėra.';
        } else if (co2 <= 750) {
            document.getElementById('status-text-co2').innerHTML = 'CO2 lygis yra optimalus.';
        } else if (co2 > 750 && co2 <= 1000) {
            document.getElementById('status-text-co2').innerHTML = 'Atidarykite langą 20 minučių.';
        } else {
            document.getElementById('status-text-co2').innerHTML = 'Atidarykite langą 30 minučių.';
        }

        // Update status text for humidity
        if (humidity === 'N/A') {
            document.getElementById('status-text-humidity').innerHTML = 'Drėgmės duomenų nėra.';
        } else if (humidity >= 40 && humidity <= 60) {
            document.getElementById('status-text-humidity').innerHTML = 'Drėgnumas yra optimalus.';
        } else if (humidity < 40) {
            document.getElementById('status-text-humidity').innerHTML = 'Įjungti drėkintuvą.';
        } else {
            document.getElementById('status-text-humidity').innerHTML = 'Įjungti drėgmės ištraukėją.';
        }
    }

    function calculateScore(co2, temperature, humidity) {
        let score = 0;
        let co2score = 0;
        let tempscore = 0;

        // CO2 scoring
        if (co2 <= 750) {
            score += 40; // Perfect score for CO2
        } else if (co2 > 750) {
            co2score += 40 - ((co2 - 750) / 10);
            score += co2score < 0 ? 0 : co2score;
        }

        // Temperature scoring
        if (temperature >= 22 && temperature <= 24) {
            score += 35; // Perfect score for temperature
        } else if (temperature < 22) {
            tempscore += 35 - ((22 - temperature) * 5);
            score += tempscore < 0 ? 0 : tempscore;
        } else {
            tempscore += 35 - ((temperature - 24) * 5);
            score += tempscore < 0 ? 0 : tempscore;
        }

        // Humidity scoring
        if (humidity >= 40 && humidity <= 60) {
            score += 25; // Perfect score for humidity
        } else if (humidity > 60) {
            score += 25 - ((humidity - 60) / 40) * 25; // Moderate score for humidity
        } else {
            score += (humidity / 40) * 25; // Low score for humidity
        }

        return score;
    }

    // Speedometer Initialization
    const gauge = new JustGage({
        id: 'speedometer',
        value: 50,
        min: 0,
        max: 100,
        title: 'Speedometer',
        label: 'Score',
        gaugeWidthScale: 0.6,
        counter: true,
        customSectors: {
            percents: true, // custom sectors are in percentage
            ranges: [
                { color: "#ff0000", lo: 0, hi: 10 },
                { color: "#ff4000", lo: 11, hi: 20 },
                { color: "#ff8000", lo: 21, hi: 30 },
                { color: "#ffbf00", lo: 31, hi: 40 },
                { color: "#ffff00", lo: 41, hi: 50 },
                { color: "#ffff33", lo: 51, hi: 60 },
                { color: "#ffff66", lo: 61, hi: 70 },
                { color: "#ffff99", lo: 71, hi: 80 },
                { color: "#00ff00", lo: 81, hi: 90 },
                { color: "#00ff40", lo: 91, hi: 100 }
            ]
        }
    });
});
