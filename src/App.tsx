import { useCallback, useState } from "react";
import "./App.css";

const START_DATE = new Date(2025, 11, 7);

function App() {
  const [downloadDirect, setDownloadDirect] = useState<boolean>(false);
  const downloadFile = useCallback(
    async (filename: string) =>
      new Promise<boolean>((resolve, reject) => {
        const url = `http://www.bom.gov.au/web03/ncc/www/awap/solar/solarave/daily/grid/0.05/history/nat/${filename}`;
        fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/pdf",
          },
          mode: "no-cors",
        })
          .then((res) => {
            console.log({ res });

            return res.blob();
          })
          .then((blob) => {
            console.log(blob);
            const blobUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = blobUrl;
            anchor.download = filename;
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            resolve(true);
          })
          .catch((e) => resolve(false));
      }),
    []
  );

  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);

  const [startYear, setStartYear] = useState<number>(START_DATE.getFullYear());
  const [startMonth, setStartMonth] = useState<number>(START_DATE.getMonth());
  const [startDay, setStartDay] = useState<number>(START_DATE.getDate());

  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState<number>(new Date().getMonth() + 1);
  const [endDay, setEndDay] = useState<number>(new Date().getDate());

  const handleDownload = useCallback(async () => {
    const toDownload = [];
    // Loop through all the months from startYear to endYear
    for (let year = startYear; year <= endYear; year++) {
      const fromMonth = year === startYear ? startMonth : 1;
      const toMonth = year === endYear ? endMonth : 12;
      // Loop through all the months from startYear to endYear
      for (let month = fromMonth; month <= toMonth; month++) {
        // Find the last day of the month
        const lastDayOfMonth = new Date(year, month, 0).getDate();

        // Loop through all the days in the month
        const fromDay = month === startMonth ? startDay : 1;
        const targetDay = month === endMonth ? endDay : lastDayOfMonth;
        for (let day = fromDay; day <= targetDay; day++) {
          // Create the URL by padding the month and day with 0s
          const url = `${year}${month.toString().padStart(2, "0")}${day
            .toString()
            .padStart(2, "0")}${year}${month.toString().padStart(2, "0")}${day
              .toString()
              .padStart(2, "0")}.grid.Z`;

          // Add the URL to the list of URLs to download
          toDownload.push(url);
        }
      }
    }
    console.log({ toDownload });
    if (!downloadDirect) setDownloadUrls(toDownload);
    else {
      // Loop through all the URLs to download
      for (let i = 0; i < toDownload.length; i++) {
        setDownloading(`${i + 1}/${toDownload.length} ${toDownload[i]}`);
        await downloadFile(toDownload[i]);
        return;
      }
    }
    // Set the downloading state to undefined
    setDownloading(undefined);
  }, [startDay, startYear, startMonth, endDay, endMonth, endYear]);

  const [downloading, setDownloading] = useState<string | undefined>();
  return (
    <div className="App">
      <header className="App-header">
        {/* Numeric inputs for start and end parameters */}
        <div>
          <span>Start year:</span>
          <input
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(Number.parseInt(e.target.value))}
          />
        </div>
        <div>
          <span>Start month:</span>
          <input
            type="number"
            value={startMonth}
            onChange={(e) => setStartMonth(Number.parseInt(e.target.value))}
          />
        </div>
        <div>
          <span>Start day:</span>
          <input
            type="number"
            value={startDay}
            onChange={(e) => setStartDay(Number.parseInt(e.target.value))}
          />
        </div>
        <div>
          <span>End year:</span>
          <input
            type="number"
            value={endYear}
            onChange={(e) => setEndYear(Number.parseInt(e.target.value))}
          />
        </div>
        <div>
          <span>End month:</span>
          <input
            type="number"
            value={endMonth}
            onChange={(e) => setEndMonth(Number.parseInt(e.target.value))}
          />
        </div>
        <div>
          <span>End day:</span>
          <input
            type="number"
            value={endDay}
            onChange={(e) => setEndDay(Number.parseInt(e.target.value))}
          />
        </div>

        <p>
          {downloading === undefined ? (
            <button type="button" onClick={handleDownload}>
              Download this shit!
            </button>
          ) : (
            <span>{downloading}</span>
          )}
        </p>
        <div style={{ flexDirection: "column", display: "flex" }}>
          {downloadUrls.map((url, index) => (
            <a
              href={`http://www.bom.gov.au/web03/ncc/www/awap/solar/solarave/daily/grid/0.05/history/nat/${url}`}
              key={index}
              target="_blank"
              onClick={() =>
                setDownloadUrls((old) => old.filter((x) => x !== url))
              }
            >
              {url}
            </a>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;
