import JSZip from "jszip";
import { useCallback, useState } from "react";
import "./App.css";

const START_DATE = new Date(2026, 5, 29);
const BOM_BASE_URL =
  "http://www.bom.gov.au/web03/ncc/www/awap/solar/solarave/daily/grid/0.05/history/nat";

function App() {
  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);

  const [startYear, setStartYear] = useState<number>(START_DATE.getFullYear());
  const [startMonth, setStartMonth] = useState<number>(START_DATE.getMonth());
  const [startDay, setStartDay] = useState<number>(START_DATE.getDate());

  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState<number>(new Date().getMonth() + 1);
  const [endDay, setEndDay] = useState<number>(new Date().getDate());

  const [downloading, setDownloading] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const buildDownloadList = useCallback(() => {
    const toDownload: string[] = [];
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

    return toDownload;
  }, [endDay, endMonth, endYear, startDay, startMonth, startYear]);

  const handleGenerateLinks = useCallback(() => {
    setErrorMessage(undefined);
    setDownloadUrls(buildDownloadList());
  }, [buildDownloadList]);

  const handleDownloadZip = useCallback(async () => {
    setErrorMessage(undefined);
    const toDownload = buildDownloadList();

    if (toDownload.length === 0) {
      return;
    }

    try {
      const zip = new JSZip();

      for (let i = 0; i < toDownload.length; i++) {
        const filename = toDownload[i];
        setDownloading(`Downloading ${i + 1}/${toDownload.length}: ${filename}`);

        const response = await fetch(`${BOM_BASE_URL}/${filename}`);
        if (response.type === "opaque") {
          throw new Error("CORS blocked the file request (opaque response).");
        }

        if (!response.ok) {
          throw new Error(
            `Request failed for ${filename} with status ${response.status}`
          );
        }

        const blob = await response.blob();
        zip.file(filename, blob);
      }

      setDownloading("Building zip file...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = zipUrl;
      anchor.download = `bom-grid-${Date.now()}.zip`;
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to build zip due to an unknown error.";
      setErrorMessage(
        `Zip download failed: ${message}. If this is CORS, use Generate links as fallback.`
      );
    }

    setDownloading(undefined);
  }, [buildDownloadList]);

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
            <>
              <button type="button" onClick={handleDownloadZip}>
                Download zip
              </button>
              <button type="button" onClick={handleGenerateLinks}>
                Generate links
              </button>
            </>
          ) : (
            <span>{downloading}</span>
          )}
        </p>
        {errorMessage && <p>{errorMessage}</p>}
        <div style={{ flexDirection: "column", display: "flex" }}>
          {downloadUrls.map((url, index) => (
            <a
              href={`${BOM_BASE_URL}/${url}`}
              key={index}
              target="_blank"
              rel="noreferrer"
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
