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

    // Fungsi utama download yang memanfaatkan data seleksi tersimpan
    function startDownloadProcess() {
        console.log("🔄 Memulai proses unduhan...");

        // Simpan dulu nomor faktur dari baris yang dipilih
        const fakturNumbers = [];
        document.querySelectorAll("table tbody tr").forEach(row => {
            const checkbox = row.querySelector("input[type='checkbox']");
            if (checkbox && checkbox.checked) {
                const nomorFaktur = row.children[5]?.innerText.trim();
                if (nomorFaktur) {
                    fakturNumbers.push(nomorFaktur);
                }
            }
        });

        if (fakturNumbers.length === 0) {
            showPopup("⚠️ Pilih faktur sebelum mengunduh.");
            return;
        }

        console.log(`✅ ${fakturNumbers.length} faktur akan diunduh`);
        let index = 0;

        function downloadNext() {
            if (index >= fakturNumbers.length) {
                console.log("✅ Semua proses selesai.");
                alert("✅ Semua faktur/potongan berhasil diunduh.");
                return;
            }

            const nomorFaktur = fakturNumbers[index];
            console.log(`🔍 Mencari baris untuk faktur: ${nomorFaktur}`);

            // Tunggu hingga baris dengan nomor faktur tersebut muncul kembali (maks. 5 detik)
            waitForRow(nomorFaktur, 5000)
                .then(row => {
                    const namaPembeli = row.children[3]?.innerText.trim() || "Nama Tidak Diketahui";
                    const tanggal = row.children[6]?.innerText.trim() || "Tanggal Tidak Diketahui";
                    const downloadButton = row.querySelector("#DownloadButton");

                    if (downloadButton) {
                        console.log(`⬇️ Mengunduh: ${namaPembeli} - ${nomorFaktur} (${tanggal})`);
                        downloadButton.click();
                    } else {
                        console.warn(`❌ Tidak menemukan tombol download untuk: ${namaPembeli} - ${nomorFaktur} (${tanggal})`);
                    }
                    index++;
                    setTimeout(downloadNext, 2500);
                })
                .catch(error => {
                    console.warn(`❌ Baris untuk faktur ${nomorFaktur} tidak ditemukan dalam waktu yang ditentukan.`);
                    index++;
                    setTimeout(downloadNext, 2500);
                });
        }
        downloadNext();
    }

    // Fungsi untuk menunggu hingga baris dengan nomor faktur tertentu muncul kembali
    function waitForRow(nomorFaktur, timeout) {
        return new Promise((resolve, reject) => {
            const interval = 500;
            let elapsed = 0;
            const timer = setInterval(() => {
                const row = findRowByFactur(nomorFaktur);
                if (row) {
                    clearInterval(timer);
                    resolve(row);
                }
                elapsed += interval;
                if (elapsed >= timeout) {
                    clearInterval(timer);
                    reject("Timeout");
                }
            }, interval);
        });
    }

    function findRowByFactur(nomorFaktur) {
        const rows = document.querySelectorAll("table tbody tr");
        return Array.from(rows).find(row => row.children[5]?.innerText.trim() === nomorFaktur);
    }

    // Fungsi popup sederhana
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

    // Memantau perubahan URL dan reload tabel
    function observeChanges() {
        let lastURL = window.location.href;
        const observer = new MutationObserver(() => {
            if (window.location.href !== lastURL) {
                lastURL = window.location.href;
                console.log("🔄 Deteksi perubahan halaman:", lastURL);
                createDownloadButton();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setInterval(() => {
            if (isSupportedPage() && !document.getElementById("start-download-button")) {
                console.log("🔄 Memeriksa tombol download...");
                createDownloadButton();
            }
        }, 1000);
    }

    console.log("✅ Menjalankan fungsi utama...");
    createDownloadButton();
    observeChanges();
})();
