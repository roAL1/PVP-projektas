document.addEventListener('DOMContentLoaded', function () {
    const csvDataText = localStorage.getItem('csvData'); // Retrieve CSV data from localStorage

    if (csvDataText) {
        const csvData = parseCSV(csvDataText);
        const recentData = getRecentData(csvData, 48);

        const labels = recentData.map(row => moment(row["Date and time"], 'DD/MM/YYYY HH:mm:ss').toDate());
        const temperatures = recentData.map(row => parseFloat(row["Temperature Â°C"]));
        const humidities = recentData.map(row => parseFloat(row["RH %"]));
        const co2Levels = recentData.map(row => parseFloat(row["CO2 ppm"]));

        createChart('temperatureChart', 'Temperature (°C)', labels, temperatures, 'red');
        createChart('humidityChart', 'Humidity (%)', labels, humidities, 'blue');
        createChart('co2Chart', 'CO2 (ppm)', labels, co2Levels, 'green');
    } else {
        console.error('No CSV data found in localStorage');
    }

    function parseCSV(text) {
        const rows = text.trim().split('\n').map(row => row.split(';'));
        const headers = rows.shift();
        return rows.map(row => Object.fromEntries(row.map((val, i) => [headers[i].trim(), val.trim()])));
    }

    function getRecentData(data, hours) {
        const latestDate = new Date(Math.max(...data.map(row => moment(row["Date and time"], 'DD/MM/YYYY HH:mm:ss').toDate())));
        const cutoff = new Date(latestDate - hours * 60 * 60 * 1000);

        return data.filter(row => {
            const date = moment(row["Date and time"], 'DD/MM/YYYY HH:mm:ss').toDate();
            return date >= cutoff;
        });
    }

    function createChart(canvasId, label, labels, data, borderColor) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: borderColor,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',
                            tooltipFormat: 'DD/MM/YYYY HH:mm',
                            displayFormats: {
                                hour: 'DD/MM/YYYY HH:mm'
                            }
                        }
                    }
                }
            }
        });
    }
});
