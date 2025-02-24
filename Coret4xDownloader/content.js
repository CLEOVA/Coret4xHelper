(function () {
    console.log("✅ Script aktif di:", window.location.href);

    function isSupportedPage() {
        return (
            window.location.href.startsWith("https://coretaxdjp.pajak.go.id/e-invoice-portal/") ||
            window.location.href.startsWith("https://coretaxdjp.pajak.go.id/withholding-slips-portal/")
        );
    }

    function getButtonLabel() {
        const url = window.location.href;
        if (url.includes("/e-invoice-portal/")) {
            return "Unduh Faktur";
        } else if (url.includes("/withholding-slips-portal/")) {
            return "Unduh Bukti Potong (Bupot)";
        } else {
            return "Unduh Dokumen";
        }
    }

    function createDownloadButton() {
        if (!isSupportedPage()) {
            console.warn("⛔ Halaman tidak didukung, tombol tidak ditambahkan.");
            return;
        }

        let existingButton = document.getElementById("start-download-button");
        if (existingButton) {
            let newLabel = getButtonLabel();
            if (existingButton.innerText !== newLabel) {
                console.log(`🔄 Memperbarui label tombol: ${existingButton.innerText} ➝ ${newLabel}`);
                existingButton.innerText = newLabel;
            }
            return;
        }

        console.log("✅ Menambahkan tombol download...");
        let button = document.createElement("button");
        button.id = "start-download-button";
        button.innerText = getButtonLabel();
        Object.assign(button.style, {
            position: "fixed",
            bottom: "20px",
            left: "20px",
            padding: "12px 18px",
            fontSize: "16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            zIndex: "10000",
        });
        button.onclick = startDownloadProcess;

        document.body.appendChild(button);
        console.log("✅ Tombol download berhasil ditambahkan!");
    }

    function startDownloadProcess() {
        console.log("🔄 Memulai proses unduhan...");

        const rows = document.querySelectorAll("table tbody tr");
        let index = 0, failedDownloads = [], checkedRows = [];

        if (!rows.length || (rows.length === 1 && rows[0].innerText.includes("Tidak ada data."))) {
            showPopup("⚠️ Tidak ada data untuk diunduh.");
            return;
        }

        rows.forEach(row => {
            let checkbox = row.querySelector("input[type='checkbox']");
            if (checkbox && checkbox.checked) {
                checkedRows.push(row);
            }
        });

        if (checkedRows.length === 0) {
            showPopup("⚠️ Pilih faktur sebelum mengunduh.");
            return;
        }

        console.log(`✅ ${checkedRows.length} faktur akan diunduh`);

        function downloadNext() {
            if (index >= checkedRows.length) {
                console.log("✅ Semua proses selesai.");
                if (failedDownloads.length > 0) {
                    showFailedPopup(failedDownloads);
                } else {
                    alert("✅ Semua faktur/potongan berhasil diunduh.");
                }
                return;
            }

            const row = checkedRows[index];
            const namaPembeli = row.children[3]?.innerText.trim() || "Nama Tidak Diketahui";
            const nomorFaktur = row.children[5]?.innerText.trim() || "Nomor Tidak Diketahui";
            const tanggal = row.children[6]?.innerText.trim() || "Tanggal Tidak Diketahui";
            const downloadButton = row.querySelector("#DownloadButton");

            if (downloadButton) {
                console.log(`⬇️ Mengunduh: ${namaPembeli} - ${nomorFaktur} (${tanggal})`);
                downloadButton.click();
            } else {
                console.warn(`❌ Gagal menemukan tombol download untuk: ${namaPembeli} - ${nomorFaktur} (${tanggal})`);
                failedDownloads.push({ namaPembeli, nomorFaktur, tanggal });
            }

            index++;
            setTimeout(downloadNext, 2500);
        }

        function showFailedPopup(failedList) {
            let errorList = failedList.map(f => `<li>${f.namaPembeli} - ${f.nomorFaktur} (${f.tanggal})</li>`).join("");
            showPopup(`Beberapa faktur gagal diunduh:<ul>${errorList}</ul>`);
        }

        function showPopup(message) {
            console.log("🔔 Menampilkan popup:", message);
            let modal = document.createElement("div");
            modal.innerHTML = `
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    z-index: 99999; text-align: center; width: 300px;">
                    <p>${message}</p>
                    <button id="close-popup" style="margin: 10px; padding: 8px 12px; cursor: pointer; background: red; color: white;">Tutup</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById("close-popup").addEventListener("click", () => modal.remove());
        }

        downloadNext();
    }

    function observeURLChanges() {
        let lastURL = window.location.href;
        const observer = new MutationObserver(() => {
            if (window.location.href !== lastURL) {
                lastURL = window.location.href;
                console.log("🔄 Deteksi perubahan halaman:", lastURL);
                createDownloadButton();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Pengecekan setiap 1 detik untuk memastikan tombol tidak hilang
        setInterval(() => {
            if (isSupportedPage() && !document.getElementById("start-download-button")) {
                console.log("🔄 Memeriksa tombol download...");
                createDownloadButton();
            }
        }, 1000);
    }

    console.log("✅ Menjalankan fungsi utama...");
    createDownloadButton();
    observeURLChanges();

})();
