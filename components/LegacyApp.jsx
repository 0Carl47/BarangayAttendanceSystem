"use client";

// App.js
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// Real fingerprint scanner (no SSR)
const FingerprintScanner = dynamic(() => import("./FingerprintScanner"), { ssr: false });


const numbersOnly = (v) => String(v || "").replace(/[^0-9]/g, "");

const PH_TZ = "Asia/Manila";
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

/* --- Barangay Logo Base64 --- */
const BARANGAY_LOGO_BASE64 = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAEOAPoDASIAAhEBAxEB/8QAHQAAAQUBAQEBAAAAAAAAAAAAAAUGBwgJBAIBA//EAFMQAAEDAwIEBAMEBQcHBw0BAAECAwQABREGBxIhMUEIE1FhFCJxIzKBkRUzQlKhCRZicoKxwSRDU5KiwtEXJXOTssPhGCYnNDdEVGN1dqO08fD/xAAbAQACAwEBAQAAAAAAAAAAAAAABQMEBgIBB//EADIRAAEEAQMDAgUEAgEFAAAAAAEAAgMEEQUSIRMxQSJRFDJhcYEjQpGxBlLBFSTR4fD/2gAMAwEAAhEDEQA/ALl0UUUIRRRRQhFFFFCEUUUUIRRTQ3A3L0RoOMHdUahhwXFJ4kR+IrfWPUNpBUR74xVatwPGR9u7E0VptLSQVBM27KyVY/daQRj1yVn3FCFcSm5qnXejdLIUrUOqLPaykAlEmWhCyPZBPEfwFZyas3o3Q1e46Lnqy8qZWnh+GhuCM1+KWgkK/HNMmNCuC3HFLbY4lqypbgyf41GZWN7lRmaNvcrQq+eKHZ+2slbF6nXRYJAbhW54k478S0pR/tU0bh4xtGIe8u26O1TLz0LiGWgf/wAiv41Sddnkvq/yiX8o6BI5Y9MV+ibG2SCt5asepqJ1uIeVXdehHYq4r3jKtKF8Kdvbwf601oH8sUDxk2rgUte3t3CR+7NaJ/LFU/TZIP7SVn+1XhVjhq/fH41x8bEuP+oRK69t8YWiXVBM7SGrY3qpphl1IH/WA/wp1WTxQbO3FaW5GoJNodV0RcIDzf8AtBJSPxNZ8OafaIwh5Q/CvKrRJAwHUOp9FpzUjbUTvKlbdhd2K1U0vrDSuqGQ7p3UVquqcZ/ySWh1Q+qQcg/UUugj3rIQQZsWX5rbKm1JOQtgkKSfUelSNobfzdPSTgbi6zuEqMkDEe6o+JbIH7GV5UkdPuqFSh7T2Kna9jvlOVprRmqmbfeMm2PpaY19pmRblH5VzbYS8zn1LavmSPopZqyOh9baU1tbRcNLX2FdGcArDLmVt57LQfmQfZQFd913lOPvXzvQK+k0IRRRRQhFFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRUE+IPxFae27D9js6GLxqVIwporwxEPL9coc+LmPs0/N6lPKhClbX2s9NaFsDl81RdWLfDQeFJWcqcV2QhIypavYA/lVMd7PFjqW8rctmhUuaegJJSqSoJXNeH15paH9XKh14h0qEdZ6r1VuHqBy9X25ypry+QddOEoT+42kckI9gPc88k/jBtceKAvHG53J6VXlssjOFWmtMiOPKTltXa7yFzJjz63njxOPPrK1rPclROSfrXbFs8Ro8TgLqx3VStGZcfeS00nKlHFfrNhPw5Co8hPA6n7yfSlktxxPBwlUtyZ4JHZcqG0oSEoSEj6V+i47rePMbUjPTIIzUqbIWW03lE4SWPMlsYU1z5Y51y7qvoVGVGQlkLacxwIGCD70jOqB9s1g3kd1L8C74brlwUZkUq6RskjUN/jWeKpKXZBICldBgE/4VwqZdAyttSR7ginnsaUo3OtRWrCSVgn0+Q1asymKB729wCVUqxiSZrHeSlJva1yZPftcC4IXcGUlS21JIHLrzNNGy6SvF2vi7REjEyGiQ5nonB51O0CZZ5Oqrw1a5JZ1EkOBJd+4QcdPypC2kDi4erbe2+gX0x1pSSr5lHBBwfrj86z8Gp2hE5zu+B3Hv5+ydz6bAZGNHbJ7fT/AJUf3za/U1rtzs5bKHm2hxLDRyQPWmna7bNuTxYgxnH3AOIhAzgVNeyDVytkDUrt6EhuM0kFSZOccWFE4z17UmbRcNg0VqXWq46HVod8phKk8XFy6fT5hVtupysZIDhzmkAfUlQP06F2zbkA5z+FEc2DLhOFuUwtpQOCFDFcL0WM9+taSo+uKnxmS5rPae4Xm925luWw8oNutt8PFgDoPxpu6a2+tTmg5Gor8+9GU6T8Kls8xzIGR36Vbg1lsbSZeCDjA55VV1CQOAjOeM+3ChV6yhriXAdW2VAgjPY1+NvuF607dWLnb5Ey0T2OTUqC4WlAD+r/AB9e4NSNq/R1y03HjS5Q4o0pPEy4O4wDz/OmwvCm+FaApPoadV9T3jcDkI+Mlhdtep82g8XV0gFm27lQjcYhIQ3d4SAHU/8ASN8gv3KeFQA+6o1bzSWprFqyxsXrT10jXGA+Ps32F5GfRQ6pUO6TgjuKyvuFpBSp6GOFXdOeRpW2w17qrbjUIuWmZ6oEokfEQ3sqjyx+6tOcHvg8iM8lCnEcoe3ITSGdkjctK1ToqH9gd+NM7oRxbiBadSNJPn2x5wEqwMlTSuXGn2wFJ7jvUwVKpkUUUUIRRRRQhFFFFCEUUUUIRRRVRPF54gWoqJegdGS/MdVxNXOcyvp2Uwg+vULOeQ5DqcCF98UHiaEMyNJbdzvtEktzLwyroeYLcdXr6uDOOYTz+YVLjQnZ7ypdwW4oqVxcCjknPMknuScknvmvdrtzhX8ZM+ZxXNKTTitVumTnvJisKWfYZpbauhgIBSu1bJ9EfJXKwySUssoGewpVlWO4W5DEm5Q3G2FkEk+npXuzcVn1LH+NbUA26OIHl0NWKbTBu0ZiFdIzKIMlsEOLTgEdj/GslqWqupub6ctPn/wvKVAWgS44I8JoaD0ppDUDseZZX0oksYU5GI5jHtmo53Vaca1vP8xJTlfKlfVttd261q3cLFcOJkL4kcB5kfukdxTf3A1KdUX5VyMZLGUgEDnk9zUdCCQ2OuHlzCOM9wfZd3JGGAxEAOB8eV37Q6kb0vrBie+opYUChz6Hl/jS9rK9aN+NdnMMmY++VH9YcZOOoqMjXLInxIznA++kK9Bzpi7ThPP1hnOMHCqwXJWx9NrchOW56hMyEIyGEJ/pEUl26fKgS25cNZafbVlCx2pIjTbjcVcFns8yeU8leSwpwg+mEg07dP7X7zakQly1aBujbSui5bQjJP0LpTke4pnFpsgbtA4XpitTuDzwUmOXO4OT3J4lLTKcUVLcB5mvVvu1xt1wE+JMeblk83QrmfY072/DRvzIODZojGO6rmxj/ZUa+OeGnfpnHDYY7/8AVukf/eWKmOlkjBwpDTsf7JGvWudVXW3uQJ13eWw4QVJSAkHHrgDNKmjdwlWPTrunp9ubnW19zzHGs8JJ7nNIGpNr95NLtrcvGhrslpH3nYzPxSB9VNFQA9zTUfuEqE6GbvbJcJz9oOtKQr3OFAVVm0dpYGbBj6cILbsR3ZypY1DuMzd7XA01a7Wm1Wlt3LgCgoqyev4Ek0/XNSadvl2sWiWUolQuIJdU2Tg4TyAP4VXOPPhvq4WnefooYNd8OS/EktS4jqmZDKwtp1BwpCh0INKrGiR4AAIxkj7nyuo9QmicTKO/9KXNXKuOsNyIei22THhQliMwhXP5QBxLJ5cuEZpN3etESfrtjT2loKVOMRkNOFB5ZAwM/QAUlaD3Be09d5d1mQzPmPNLSHVLOcqx9ae+y7xkxr5qDHxN4WHDwr5YzzP8c0tm61D1geloAA93HuSrTRDb9IPLjk/QBRvqXQF+sMYSJDJcbxklI6Uzp0Nia3wuI+cfdWDzFTtpJOqEx7leLs4ubEUCJTb/ACCUdiCfy/Oo4g6WuepplwmWKD/kjbi1qGcBtOeQplR1B5z1XjjHI7ZPhUrFUxkPhyD7KOW13Gz3ViXHmPx5UdYXGlMrKFtqHNJyDnkcVdnwxeIxnVHkaQ1641C1ESG4kw4Q1cO2PRLvt0V2wflqoshgOJWy8jn0II5g03X2nbcssqWtLB/VOp5KaV2Oa1dW11Dhys07nV9D/mWueaKrB4Rd/wAaoSxoPWs0C/so4YE51WBcEAckqP8ApgO/7QH7wJVZ4Grqvr7RRRQhFFFFCEUUUwt9dxbftnoOVf5RbcmKBat8dRx5z5HIHuEjqo+g9SARCibxo72vaMtaNE6YlBq/XBsKlyEH5ocdXLAI+64v80pyeRKTVKLVAU6sS5af6iT2FfvKlTtT6inX+8yXZcuU+p551w5K1q6n/wAByHIAAClVll15YbZaUtXYJFLrdnHpalVy1+xq8tpzU22iO9pfbuFeYEVEj4hQCldeHlmkrayy2i8Wt6y3aN5MlZIadKcKKj2pch3mZtwmTpnUdu+NsTpwy4RnhB7Aen41htQt/EydBgy5pzj/AGH0U1Ct0m9d5wD59ivVysFh1PpNd1d4GZjKONZB700Nba8M7TcCxw+NoxUhClY7jHSjV+uYCrUu26dZVHZcPzHoMd/z/wAKjdSlFXEan0/T3u9U3YHLQfCju3/2xHkjkjyv2kS5Ug5kSHHMn9pWa4Zc5qOtLQ+1eUrhS2jmok9AB69qXtA6S1RuRqQaf0bCL5RhUuYs8DMVBOONauw68hknBwDirp7MeHbRGgWo8+ZHRqDUDTwfTcpbQ+yWOgaRkhAGc55nPPPIY11enkZd2UMFR8nql7KrW2/h/wBz9fiU7KhnScJnhCV3WO60t4qGfkRw5IA6nkOYxnoLF6N8JW11utcVGoY8+/XBKB8Q85LcZbcX3whChgZ6DJ9yasIkYrju10tlojiTdbjDgME8IckvpaTn0yogUxZG1gw0JrHG2MYaF4sNntlitjVss9vi2+EyMNsRmg22n6JHKu4pGcjlUca33y2s0fFU7ddYW950DKY8FwSnVZ/ot5x9VYHvXFoLxB7V6zn/AKPtupGokxSkpbZuCTGLqlHCUoK+SlEjGASa7AUgUqkV8r6D7UGjC8K+kZpL1Jp6yaltblsv9qiXOE4CFMyWgtPMYyM9D7jmKT7/AK80VYJaYd61bYrdJUoJ8mVcGm1g/wBUqyKZz/iH2dZvi7O5reB56OrqEOLYPsHUpKCfxoAXqZWvvCNtldbNJRphmZp65qGWH0y3X2wr0WlxRJT9CD/dVa9xthd09uXmSIK9T29xCliRaGHXw0E8yHE8OUHHPPMEd+Rq/wBovWmlNaQXJmlb/b7wy1wh0xXgstFQyApPVJPPkQOhpfrxzGuGCuHxtkG13ZZSQ7jGlJASShwDPAqnHpfUVy07PEy2ulCsYWnssehq4O9Phm0Trlpy42RLOl72pxbq5UVn7KQpXP7VvIHXnlODzOc1SvVlg1ToC/q0/rW2OQJKU8TayQpDyMkBaFDIUnIP06HB5Uptae1zTgZHslU1N8J6kJUgy9ydTana/m/wRGGpqktOcAI4hkcs9qeW41yZ0HoeNpKyMufHXBrikyAPmAPIqB7k8x9M1BkJ9TLiJLC8LSeJChUqWHc+zEQ3tS2hUybCSEx3uROB6+9ZW5p4jcx0MeWjktHk+Cp6lrfuErsOPAJ8BI9824lWfb9Oorqv4eY6QW45GFBB6cqjl1tLzRbdAINWAtUG+7p31V3uqFRrLHyUpB+XHt6n3rg3R0dp6Yh1vTrQalw2+JaUDAUPpUVTWulL0Jzl55OOzfYLy1SDwZYRho9+5+qrXLZkWyY08w8tpaFcbDiDhSVA5GD2IOCD2xWgfhK3n/5TNK/oq9PIGqbWlKZgOE/Et9EvpA5ZOMKA6HngAgVSKZFbksrjvo5jl7g1waC1Nd9B6wg6lsrxbudte4lIPJMhs8lIV6pIyCPQ56gVvK1gSNxnJU1OwZW7XfMFrFRTa2y1ladfaKt2qbM5mNMbypsqyplwcltq/pJVke+MjkRTlq2riKKKKELy4tKEFSzwpAySegrOLxTbjvblboOMQH1KsluJj29KT8qkg/O97lZ7/uhNWu8ZW4Z0Vtc7bIjhbuN+44jSgeaGcDzl/wCqoI+rg9KoPYY2Q5LcHzOHlUE8oYwkqvZmEbCSlNlpDSAhAwBTk0Jeo1i1AxMlxUSGQcKSrpXPpNmFIv0Ri4FKY63AFKUcAVNc7RWmXpDMeTHUllwZDqDgD8axuq6jDAelKDhwS6lVkseuM4IKVtSOW+5WaNqrSLDLwZAU4gKAUMdj71EW5W4c/WEZmHLgtMBk5CgOZpT1qiDo1bkfTVwcW28n7VBPI/XFRmtanFFSiSTVDSNOiB6pG7Hyk9x91b1O48N6LeM9/ZfmrhSgrWrhSnqaeWxm1V/3ivqmWC5A0vCcAnXAjmVYz5TQPJSzyz2SDk9gUjbHQ143S13F0taApmKg+bcpvDkRmQfmP1PQDuSO2TWjuiNMWbRumIOnLBETFgQ2whCR1Ue61HuonmT3NbipXx6nKGhU2N3u8r8dBaO07obTsew6atzUKEyP2R87h7rWrqpR7k0uurS0niUa/QVFniUv1li7eSdMz70u2zdQj4KL5TnC4oEguHPZPDkE/wBLHer5TMBQH4jfFZOZuU/TG2rqWRHc8td6QpDnGR94NJIIx24jn2x1qrOrta6s1fKEnU2oLjdXASU/FPFYTkYOB0H4AV51pp9/Tl4XCflMyBk+WttwLBAPtSdZInx13hwfm/yh9DWUnB+ZQHL868Xq5MV+kJ9yLKbkt/fbUFJ+oOavDp/w87XWiQpS7dOurihwn4+TxoA9QlASM+5zinDF2W2rjLKjo23q4jnDhWsD6Aq5VVN6IJkNLm8qGtceK/cDV7USDoO2HTMhhhyRMcQ43LceCGypQSHGwEpCUqUeRUcdeXOLr9v7vDe7a5brjrqeqM6MOCO01GWR6cbSUqx7Zwe+avFprS+kLAyEWLTFog45cTMVAXj3VjJ5ZHM9zUfbjeHnQOsL5I1DxTrXLkqSXmoSkIYJAwSEcPyk454OM88V4L8fleO0yVqog6444tS1KKlKJJJ6k14FWc1f4XAwjOmdRLW6M/Zz2glBHb509P8AVqHtw9p9Z6JU2u624Px3U8SZEQl1r6E4HCfYgVOyxG7sVDJRmjGSE9vCHunb9rdVXObekuLtdxYQw/5eCtBSSpKgCRnqRj3q2W0XiU0duTuAdI2q13WG66045EkSg2Ev8AyU8KVEpPDlQ9knpWbxCkkpUCCOxp8bK7mXbavVDmoLLa7TOlOM+QTOZUvgQTlXAUqSUk4xn0qYKotWRTa3D0PpnXmn3rHqe2MzYriTwLKQHWFH9ttfVCh6impsJvVpndmxl23EQr3GQDPtbiiVtc8cSFYHGjPcdMjIGRUoZBGRQhZrb17Y37ZvVSYMtTs/TkxSv0bPxzUkH7ixyCVpyMjoeo74a6VpdQlaDlJ6VpZuXoqybgaQmaZv0cOxJKflWPvsrH3XEHspJ5j8jkEg5wa50neNstdS9G6gAPlELjSUjCH2j91xPse47EEdqX26+71NSu7V3DqN7qY9B62mXrRi9NMyBFmRWy4g5wHEp58P8Kad41xJDRa+G8mSvk44DyWKj9t96O6HGHVNqH7STg1NUW4aLmbcwp79sU7KQSJSW2wspAODk8utYmxSipy9QM3Bx8eFLXmdcbtc7aWj+VHGorE8mxxr+xxrZe5uqPYnp+dMe9xuJCZbIw833HcehqdLfqPbJGmZ9rL1yR8UQShxJIR1+7jpUNSC1xrbbJW0chJI6inGl2ZATvaRjtnjhVrDG1nNdG4HjnClfwR7l/zO19/NO4yPLsepHEhriPyx5Y5I/wBc/Zn1ygk4FX9rIl5pUee5GQtbfEfNilBwQv0H1/vxWlPho1+ncfaW2Xt5wKukcfBXNPcSGwAT/aHCv248dq1jHbmgpqx+9ocFJtFFFdLtZz+LfWR1zvNNixJAdt9tUIEUpPy/Zk+Yr3y4V8/RKaYbDYbaS2kYAFJNoHnzH5ZUXCDhK1E5PqT+NOrTDcV69xmpi0pZUv5io4FJdRmwT9EmvSCSURhOa2beXeZYlXVpxISlPEEqGM/jmnlo3XnwOmHrJqVlanG0kMOrGcH3p9QNPy4cUzrRcG5kVbORH4uSvXAqHtytTIuTblvesnwkhCiDkY4Ty59OdYaCd2pvMcoyM59iEwdAKDeo3jjGPdMe6SFvznlF1a0qUVBSj1pNmGU7Ij2y3MuSJ8txLTLLaSpS1KOABjuSQPxr93FJQgrUeQGTU8+BTb5GoNW3Hci7ReNi1r+GtgUMp+IKcrcGepQkgD/pM9UitvRga44PhKqkQlm3O7Kxnh02yibX7eRrT5SFXeUlMi6yAclx8j7oPdKM8I/E9zUmCjOaKd9k9xhfazO8ZdwvMvxD6jZu6nMRFNMREK+6hjy0qTwj+lxFR91GtMRWZXjOece8Seq+N3zOBcZA5YwBGa5V6vVEClqWcqOT61LfhU0XH1fupHVOa8yDamjNdTxFIUtJAbTkf0yD9Emoiq7ngwttvj7TyJ8R/wCIkPXFXnrLZSUENt/ZjPUDOc9Dmq9qQxxkhW6UYfKM+FODDDYUFKHERXpzyzyWOlfUuICQc4r8VHicKqz4K0zQuZ1tbSypBOD6V+SpikfeJrteV9nSbKKFEoKAfeuSVYbyueRI85fOk+Sc5QK9ErHNI4k9jXO6HCr5fxr0FTdkz7/tVoXUktUy72YLlr+88y8ptRwMDpyzgdwahnerYVGnbTL1PpiXxWyOjidjP/rEDPUK71ZltK081DFeb9ahetPTLWsJLcxhbK+IZGCCKtw2XtOcqhZowzc4wVQvbpTI11ZWpNyctcWRNaYkzG3OAsMrWlK1cWRgBJOa1X0XAtFp0tbbbp8tqtEaMhqGW3Q4gtgAJIWPvZHPOedZL6oiKteo7hb+EpMaS43wk9MKIx/CrI/yf+utSN7hP6JMl2VZJMN6SI6lcQjuowfMTk8s/dIHUqB7E09ByMrIvbtcQr4dah/xUbTx9zNvHvgYrf8AOS1pU/a3uilEDK2ifRYGB6KCT2OZgBr6a9XKyftEh9XmwZza2pMdRQtDieFSSORBB5g5yMGnvoG5S4kiRbWklxmekMuJzy69afvjh2/RpPcGHry0RC1bb6pTc9SEngTMHMk9gXE4PLOShw1EMWU/FcS6wsoWOeRSHUqwILQO6SzMNafqDgFKGr7Oq0XLy+MKS5lScdhmkTHOuuXJkzXS88pTqz1JNKVi0nfb1Eel22A48wznjWOQyBzH8apMcImDqO7eVVeOrIei04TS1Cw4uIHGThxlXEkipr8CmuW7BuzI0vIdDcDVDH2Sc4SmS2FKQB2GR5ifc8FRRKZWha2XkFKhkKSR0pv2mdMsl0jXO3uqYnWiYiZGWDzGFBQI+igPzp5QlL2kHwmWmyEt6Z7ha40Uk6Ov0PVGlbVqK3n/ACW5RGpTQJyUpWkKwfcZx+FK1X0yWUVlj+Tb2xjBPM04bFYLjelOCE1kI6qPQc6SUJ4G0IH7KcU/tsNXxbH5kC4MAxnjzcT94E1k9QnmbG6SEZcs9B05p/1DgFLektObh2ltyXAu7KYzPVsuZSqmBqy7z7zenpE9ttt4KIIQMCpl1okR9Hv3Cx3XzI76cqTnB59jUCqytZKiSc9aUaRIbBdM9oB7dsFMNTIia2Nuf5yuK6NSZJYt0NtTsua6lhhpI5rWohIA98kD8a0r2c0cxoLbeyaWZCC5CipEhaBydfPzOr/FZUfpiqMeGfS7esPEVZmnUhUSzg3J/wBy0QWx/wBYUfhWig6VuabNsQUtKMMjGF6oooq0riKzC8YPCfEdq7hVn/KGc+x+HarT2ssvFA8p/wAQGtFr+8Lo4j8E4SP7qEKNhUy7H773jbWyOWBq2xpttdkmSri5OhSgArB6H7o6jtUNV6xmuHsDxgqSOQxnIV4tM+JvbG7xG1agaudllhOHAI5eayOvCUZOPqkVKmn73p/UdnF305eodyhK6LZcyU+yh1SfYgVmRiljSmo73pe5JuNjuMiDIGMqaXjiAIOFDooZA5HlVCTTWH5e6vwai9jsu7LSORcosCM9NnuoYiMILjzqyAltA6qJPQYpstbp7WXB9MdjV9tS4s4Txr4R+fSoPtmsNS6w8K+rJWqluPn4jy485MdKOIJLauE8IA+/8ucftYqrfMd6hgo5yHHlW59R2kOYOCtLfMtMxsKg3m2vpIylTclKgR+BrymDxH9cz9Q4Mf31mzGClvJbC1J4iBkVOmjNptxrtp9Mu2ataYju/dZW67xEfTBxQ+k1ndykg1CSTOGq3jEMJRwqU0vHooGueM/CnS5NviuKEmP+tQUEYz93n3z7U09kdLai0jp4xNTXRu4SONRSoKUogH3VT5lJYRxPsIAeWcEjqR6VUcAw4TJpkcAQFDE246PuW7X/ACS670fYbfZLgnj/AEolgMy5MnIcaC3gQQFEKTkc1EgZ5nEyWnw67XWa/wBrv1jtEu13C2voeYdjz3hkpOcKBUcpPQjuCR3qF/Frp+1XTbpd/ltpF3txQmM+E81IJwpB9R/jUx+DW6Srv4e9PSJ1ydnymzJZcW66XFo4ZDgSgkknkjgxk9MdsU6qyiRnCzGoQuinOfPKmGgV9oqyqOEwd/8ARB3C2mvmmGQ38Y+yHYSl8gl9tQWjn2yU8JPoo1m5YH1uQPKdBDjKihYV1rWE1mjvhpVnQu/OorIwkIt7zolxEgYCWnRxhI9klRQPZIqtbYHRnPhVLrA+I58JX2c+DVdZEV+M1IkrRlgODKc88j+6pIP6Q03pWQzKabjJclg4QeXCeoqB7ZMet8xuVHWpDjZykg4OamGXo3V2t2Yz11v8dbRQCloIISnIB7Y9q+f6tCxswlkeGsPv9PZGl2CG4Y3JCjHXyYg1RLXC5suYUDjHPHOmLdWkt3RpRXwNyG1MqOM9RgfxIqSdwdH/AM1gwf0g3L80kEoHIHlyzn3qPNSoPwaH08lNryK02lzMO1zDkKlGXw3DvHdXq8B2oF3fYtm1vucT1knPQuFR+YIJDqc/9aUj+r7VP1Ut/k6r55WqtY6ZUvPxUZi4Nc+nAooUcev2qPyFXRxWjTlZX9TUqad0JZZljaelyvLluDiHEe1RYjkoH0NTbpzV238yHGRd3ZESShsIUOEkcu+awOryWGMHRB+uEm0tkJeeqR+Vzazscez6NP6MuinezjfFkEfSoez8yql/c+9aSasCWdPTzLcf+8f3U/8AGocfWUMrUDggcj70aIJHQl0gIJPlSamWGZrGdlYH+Tvs639Xa01GU/Ysx2YSD1CitZWr8vLT+dXPFVs/k8o7aNmrtMAy7Ivr3Go9SEtNYH8TVkxW8aMABMmDAAX2iiiul2isod/pLkvfDXDrp+YX+agfRL60j+AFavVlx4qLfGtfiE1lGiD7NdwMg/13UJdX/tLVQhNjR+hr/q2DMkWGGua5EKfNYRjjwoHmMnmeXQc6R7dabhcLo3aoUR56c4soSwlPzcXpz6Gp78ITDyGrtcW3PlbdbQpCFfNzBwfp1qxNsnMuzVSGtPwIjx/WyEMpDi8+qsZNLZb3SeWkJ/X0g2IGytP3VQYuzV/tdkud71yy/p23R4JeivrLa/Oe4hwNlIUVDiHF2zypi2KyKvmo41ngymsyXwy064CkKyrAOBk/hUoeK7V93uu4cnTbsptVntpQqOw05lJWtCVKUvH7fzEY7dKWvCTt2u5XRO4Ep8fDWl7/ACZlHCouvcJ+9zykDIPTuO3OrRl2x73Kh0mvn6Uf8qer9oCJI2Rc0BbEtNtptaW2yhP35Dfz8eM5JU4kE/U1QeUw7GkLYfQW3W1FK0KGClQOCD71pKzcPtAptKhw9ldDVbNz9B6W3W149N0DqGHGvilqN5gTGlscJTyU4gKSCVZHzJA6nORml1K36iH9kw1Cnw0s7hV0slruF6urFstUZcqbIVwtMoI4lnBPLPsKkkWje3TEdK24l8hMtjhBQQQAPXBPr3p1r8NepIurGWm7uwLP5iiZraVIebSnofLPc8uiiPerDaLtsmwWpqzu3WVdw10kSXMufif/APdKnsXYxjbgqOpp8rs7stUYeH7U2518mKGo48uRawjKJq0ADjB6cuv4envU9h0KbSQck9a/HJQn7iW0dwgYAr9GpDHClLQJz3pXLNvOcYT+CMxsDScpt7m6Kj7gaRe03Imqg+Y6hxMhLfGUFJz93Iznp1ri8Omz2qdutVolWTXAlaYecWblbno/D5iuDCVITxEJVxcPzDHIYOR0fP3UFVQdvfuVultvrC3XiyRXhpTKCriYKo8hYJ8xpxePlJGMdD1xnBq5QmfvDPCU6vXZsMvlXMopE0FqFjVujLPqeKwthi6QmpaGlqBUgLSFcJI5ZGcUt06WaRVHv5QbT71v3M0xqltQ8q4wFROHHMLZXkn8Q8kf2avDVWv5RiMlW3ml5vB87N68sK9AtlZP/YH5Vy4ZBC4eMtIVVEdKsBo1TOntFx5mpb04oSUIQ0lSspQCnl9eWKrwsFcbl1xS/Nfj/wA32WEz35L2QVIcOQgfSsZqVP4pjWE4GfZKtPsfDl7scj6p4bnx9O23TFutVmuwuj4fW6pwEHHFiopv6Aq0Pe2DXYnlXPd21O295pH3lJ5VbowfD7W5zz3UEljqztfjCkbwN3ZVv8QdrYQeH9J2yREX78KC7j82k1onisxPCjK+F8QWh3B1Mxxsf22lp/3q06zWqT9ZZDpXRGgSZDS3W21KQgZJAzXmApCJranU8SAfmAq1W12ldLydHKlkIIcRlWTzBNYDV9WGnMDi3OSken0fiyecYVTuH3rnuZxAe9xT03Oj2uHqF6LbUcKEKJz60zZzZcirQnqRTanL1WskxgFV5Y+jNtznBVy/5Pj/ANhD/wD9akf9hurFDpVb/wCT1dSdl7nG6KZvzwI9MssmrInpWoWjCKK+Cvter1FZZ+J2x3Owb76tjXd4PvSbi5NbcBOFNPHzG/ySoJx2II7VqZWcHjwQoeIe4rIwFQouD9GhQhRZoXWV90ZcjPscosuKGFpUkKQseigRz/hT5v8Av9re52pVvZcjQm3mFNSC02CVlWQSkkZTy5dT3OfSI0ivuKidXje7c4cqyy3NGzY1xAXpXzKKjnJ61I2zW69728nKjtqMqySn0uzYRSCVkDBUgn7q8e+DjnUcCn3szo2za21Wi0Xe+fosHBbSGuIvDnlIV0SenXPWvZWs2Hf2XlffvGzup3Hic0ihpPBpq7qPPOVNj/GoX3Y1xZNQ6xjaq0lAulouQPFKcW4nmsY4Vo4TyOMg59B71PVn2Q0JbS40u0ruSgpSfMkvEqA7cknhz74pfgbf6JsbEuQuxwYsV1hTcpR+6W8DIVxHGMgH60jjtVYnZY0rQSUrT2+t4AUabbeIRy4qatWtktIcdc4UXFtPAhOf9IPr3Hvyqc4xJQHY7jTraxlK0LyFD1qru7e08Jpl3Um3Vwi3qzoyZTEV1Lq4h5fukkp598EfjmkjbTejUmjY6YLyE3SE2AlEaQceWB2CsZ/vqaSoyVvUh7+y4gvuru6c5491cy3Pv5LbwKx7DNKXlpGMACoP0d4h7Zfr1EszOn3Y7kkhKFqdBHEe1TKmQ6o/sj8KXSMfHw4JzXe2ZuWldrzp6Acqiudv/Y7JN1Lt9r+wSEW8QXmmUJjq8yQpST8igo/cWFApVyA6n1EmwI8y43NqEhhRQ4oJKjyynPP8hz/CpGmaL0ncLzHvVx01Z5lyihIYlyILbjzXCcp4VqBUMEkjnyphpse5xd7JLrkrQGxjv3TV8L9t1FadidL2/VMcxbizFIDKhhbbJWotJWOyggpyOo6HnmpMrylCU/dGK9U7WbRVZv5Rfls3ZP8A7ha//XfqzNVa/lGZH/o50xEB+Zy9+YB68LKx/vCgrw9lUyAMw2vpSjarbOucr4aCwp5zBUQOwFccAFlpvIzwirO+Hb+bUq0quKoDMaS3hklXLi5ZP99YnWdSOnwOlDN2EloUxcnLScDlVoeacZcU06goWk4IIxiueZ+oV/VNTJ4hzp6JfVwrdb2Uu/eLqRgmoZuCwiI4vsEmptMtfGxMl243KGxX6FgMznBXf4bVY3+0Ryz/AM8o/vrUesu/DK0qRv8AaI4eX/OoWfoAVf4VqDg1sAtACstUmnA1rK+xmWo8aYtplGPlSeuKb2akTaXb1jVrLs+4yxHhtK4cAjJ/OsbdfBBGZJ+wWeqRzSP2RHBTEu05ydMVKdCQtfXFcoORVgY23O2CZabeu6ofkqOEhL4yT9KhzXlkTp/VEy2s5LDavsie6ago6pBYd04wRjnkY4UtylNAOq8gqZP5PG/Ptao1fpVxeGnGG57aTzPGhRQo/ktH5CrmjmKzz8KWpI2lPERbTJIRHvDC7atR6JW4QWz+K0JT/arQxPStpE7cxpTau/ewFfaKKKlU6Krf409k3Nd2JrWOm4fnajtLKkvMIBKpsYZPCAOq0EkpHUgqHM8IqyFeHBnFCFjgRwqwaVNSJsomsiwOSVxPhWOPz0cKvP8ALT5uOZ5cfFg+lXH8Xfhxcvfxuv8AQcUfpPHnXO2NJ/8AWyOrrQH+c6lSf2+o+bIXSNBIWCe1CF6xQHFtLStCilQOQQcEVazbC57Y7ibex9PX6LDj3GPhLwCEtOPnsUcJB9O/Ue+KWYewG2chxQ+Fu6EqTlClyCOvT64x/Gl79QYw7XggpozTXyAOY4Kp8S9XZlvz49+uDL4cwUoeWk4/eyD645U/bFond3XVhQpqRcZVrWshIl3ApbUR34VK5/XFc7Le21p3DmwL3YL47bIslbDTaZQCyUqICl8gcHGeEHPTnVvo8qPAt7MG3soYjsoCEIQMBIHIAe2Kjt2xCA4NU1Om6XcHP4CpA1J1Xtxqx1hanoNwjL4HmXDxIcHooZwpJ/8A5VqdGaE0PcDC1enTsNMudEQ+6ytAcYSpxIUSlCgQCDkfgfWkvenbxW40eK9DfYiXGFxBDroyHEH9hRHPr35458udSFpGEq1aVt1oceDzkSM3HWsE4KkJCSRntkVVntb4w9vB8plRp7JSHDI8L97XpjTFsfEi26assR49HGoTYUPocUvss8wTXPHSlsBbx4U+p6Co/wBxN5dM6MnNQXy7NkOZPBFUlXAOxVk8vp1qkzfOcYyU1lligGTgKXdE3aW3uG1YkQEKiOW5cl+UpwpW2oLSEJSnHPPzZOewqVBVb/DJqbW25GtJOrpkVm36St7LsSKhTI82S+opJ+b0SE8z0yQOfayVaKrGYowHd1ibs4mmL29kUUUVZVRFUo/lDdQtytaaS0qgL44UZ6a76HzlhCfxHkqP9oVdYnFZyeJ7UMbV/iMvkqKvzItr4LchWc5LQwsj28wrx9M96jmdtYSopnBsZJTHH8BStFvdxiw/hIsl1lnjCyEKwSade0lr0repT8C+r8t9xOWF8XCEnGMZ9a49e6CvWm7mpLcN2VCX8zb7aSQR+FZB9yB05gfwe4z5+ySsry9Pqx8hNi43KXcVpXMeU84BjjUck0j3hXDbHvpXe4hxtZQ6goWOqT2pJ1M6G7YU91HlTGu0b2ho4UMbnSzN3d8p8+DqC5I8RmkEhGfK+JfPsBHd/wAcVpVmqE+AO1/H73XC4cOWrZY1gL9HFrbSP4Fyr71olpVlNZ3kvwGlJ7DBqYNjp9vlMzNNXGR5IlJPlHixk+lQfplZaW9BWrJQo8IpbDrrSgppRSrrkday2qUxMHRE4SNspq2S4f8A2VYTTO0Ntsd7RfLrffMhx3PPAK8BeOmefSoo3avcO9a3myIHOMhXC2f3h61+Nh0vrvVCAIqJ7jB/adcITSvrTbGbpTT7M+fLaW8r76EqyRSKq1lezmxPveeAAOyu2g6aIiOPDe6jia/JgPRbxBPBMgSG5DK8Z4VoUFJP5gVplthqqNrfQNm1VFSEN3GKh5TYVny19Foz3woEfhWaRAW2ptQylQwasd4C9whBuVz2wvE4jjUZVnbX0yAS82k+4wsD2Wa2tF/o2qPTpct2q4tFFFMUzRSVfNRWKxoS5e71bLY2oZSuZLQyk/ioivx1zYP50aYmWP8ATF2s3xSQn421yPIktYUD8i8HGcYPLmCay83wtNu0/unf7LaL9JvkWJJ8v46SoKdcWEjjSpQ5KKVcScjkeGhC0cvW9W01qiOyZG4WnHUtjJRFnokOH6IbKlH8qzd3aeYue4N9v0CEYlvudwfmRkcIGG3Flac45A4UMgchTQAyoc+9Wq0poe26l2ghWaegNv8All2O9jJbWrv9D3Her9Kl8VuA7hI9a1qPSem+X5XHH/tVZYddjupcZcWhaTlKknBB7GpAi71biRktoTfSUISEgfDtDly5ZCc9hTQ1VZZen79LtE0APxnClWOYI6gg/Q0lGl0sDCcPGU/hsuDQ6J3BU/R91Nt9Uzos7WWkDDujRSF3GP8AaZKTyKgMcXLAwQe9LN+3u05Zz5NpW5fcgfOWywMehKgTnp0GKrSkULFUX6XE9+7n7Z4V9mqTNaRxypl1dv7fLhEDFhhpsnEMOLQ55qlfTI5Vzad30v8AarH+j/hG3nioqVJKlcSiSTk8/eokaZddWENNrcUegSkk1Imj9n9U33gffii3QyRl6RyPCe4T1NX6+j9X0MZlL7evCmOpNLtC9XPd7Xt1cWzHuzsdD3yFLeM4PvUoeGjw83DWF9Z1HriMtiyMrz8KrKVy1AE8B9Edz69OXPD62W2QsMS6oEPinSkAF6dIQPsU5/YT0Cj0B5n36g2xs8Bi3QGocZtLTLSeFCQOg9/Uk5JPvVyWlHSwz939JTU1x+sOL4wen7nz9l+lot0G022PbbbEYhw46AhlhhsIQhI7BI5CuyvlfaplMwiiig8xXq9TU3c1fE0Ht1edWS0FxMCOVNtj/OOKIQ2n6FakgnsOdZkWUOLZdnyFFciS6pbij1USck/xqynj33BTc7za9tbNO8xuMr4u8IbVlJcOPKbUR+6MrI/poPUVXmOyorZjNJySeEVQuy4ZhLb0vHTHcqR9pLRpktyrzqOUlkRiPLaUcE9efvTxu++0Xz/g49mEiK2kJSVEdu45UydeaQa01pi2vPF8S5qONSTzTg46n8aj8prGijW1F/xEh3Dx7Bci7PRaI2ce6VNVXZu+XyRcm2AwHT+rB5CmjflJkTo0POAFFbh9ABk/wFLWKac18KflyVrwf1bfL16n8v761GnQgOGOwUFIGacyO+6ul/J1WDy9J6r1atso/SdwRFaB7IZSVHH4vY/s+1WrqNvDFpNzRmx2mrNIb8uUqL8XJBGFBx4lwpV7p4gn+yKkqnKdrKjX+n5eidwbhZ5YIct8tcVxRH3wk/Iv6KQUqHsa7YUgRpjT5QlYQtK8Hvg5qwfj90CUzrdryGx9lLSIU/hHIOoyWVn3UniRn+gn1qs9ikmRBSFn7RHJQ/upbqEe5u5K9RiDQJG9wpqm72339GtwbDCZg8CAkrCcnl3xjr1pMg6N1freAu+vXXzQsFWH3FKJ/AdK/TZiBa5lov6ZbIelIjEtJ7qBz0p76ZlT4e2cuc6wY6IiDwDhxnJANYK1JHQeW1GAOyOT5yrsDX2Gt6zsgjOAoDuUN+BNchyG1IcbODkYzXLGmXKxXyDqiyPFi4219uQ04OyknIyO47EdxT83inWu43qHMtriHCqI2HinsvB5Ux0KKT7dwe9aehYkMbXuGCe4SN//AG85DOwWjezOvIG423ts1RCUhK5DQRLjpXxGO+n77Z79eYz1BB709Ac1m/sduZP2e1r8ehLsrTdwUEXGKnqOuHUDstOT9QSO4I0N0ze7VqSxQ75ZJjU23zGg6w+2chaT/cQcgjqCCDzFaWOQPbkJ9FK2Ru5qUzWSe6WlZWjNwbzpeZKblPW6R5ZebzhwEBSVe2QoZHYmtbKYGmtptF2aJf2XraLs7qF9x+6yLiA87KKyo8KjjkkcRwBjH1512pVlalPzDn3q3KL21pbaaNdJSuHhgIQ2O6llGAPzrxvp4SpVmi/p3bNybdUIdU5JtchxBdQjrlpXLjwBjhOVHsVHlUNb36xVPVA03AdSYUBhAdCeinQgAj8KbabbFVsjh3IwFlf8h0t2qTV4CPSCSfsMf2o3vFwlXO5P3CY4XXn1la1epNcg9a84966osKXJbdcjx3XEtDicUlJISPelbjudlakbI2hvYBTht/pnRWrdCMyXLUG50f7B9bbhBKh+1+P9+aV4W1OiArjVHlrI/ZW/kfwApgbAaiFrv67bIXhiWk4B6cYBx/iKmYpkNzVnHynsa02lMZYAL2jI4XyzX7F+hbfHHKQ08jldVmtdhsLYRabTFaV04uDiV+asmvupNWwdMWj9IXZRAWrhaaSfncV6AUlah1FbdMQFT7s4B/oWgfmcPoP4fnSHtJt3qPf3Wzd8vaH4ejoK+F1wnhD2CPsWj3UeXEroB78ILbUdSjox7Ix6lR0fQJ9VmElokxjyT3PsFbbw33eLqTaW06iYgKhqneataFc8qS6tvPFjmPkGPQcu1SUK57XboVrt8e326M1FiRmktMsNJ4UNoSMAAdgBy/CukDFYV8hkcXO7lfXK9dleMRxjAC9DpRRRUamRTF3y3BhbbbcXLU0oIcfbR5UKOpWDIkK5IR646qP9FKqdWobzbNP2aVeLxMahwYjSnX3nVYShI/vPt3rOjfPc66bva3NxX5jGnYC1JtkJSiMJP+cWP31ADPoMAHlmuHvDBkqOWURtLimWZE+83idqO7vF+43F9cl9w/tLWcqPsMnp2p37aRGH9URJEtSUssL4159KbHIcugHapt2qs+l9RaPXaxKSxc1clAqwruQR/wAKyGsXSyEudnB448JRXzasbvPdOa7boaRu89yxXaE2uKghDbygFJ5enL6VHe6undKQ4P6U0/JQQtWPL4s/lSNr7b+9aYfK3ULkxifkeR8wI9TTMJPQkmlem6ZXZtlqSHb5GeCrFy7IQY5mc+/lcN5fLEJak8ir5QfSlTYTRSdfbuae0ylouxfOTJuKscvh2zxOA+mQAgH1UKa18mFc5SUn7KPz+qu1XM/k/tvlWrR07cK5Ngzb4ssw+JGCmMhR4levzuZ5ejaSOtbynGWM5U9KIxx5PlWnAA6DFFFFWlcTa3N0jB1zoS7aVnngZnx1NpcAyWnOqHB7pUEq/Csvb1b7hpHV8613dhTEmK+uNLbx91xJwSPVJ6g9wRWs1VL8d21CpkFO5dli8a46EsXttscyyOTb+O/BySr+jw9AkmuXNBGCuHsEgwVXXTF7l2G5tXCEsFSSMpPNK0+hHpT31pu3ctR6dXZE22NCZcI41NkkkA5xUOWCaABEkKwoD5F9lCl+Gx8RLbY8xLfGrHEroKy1vT4RMJJW5I7FJXSz1swg8J6bOCFK1c3Dn28TGZCfLKeHi4M966d39t5ujp6pUVCnrY6fs1gfdPoalDTsfT21mj/0vIW3KujwAQlBBVn0FMEbx3S42u4W6/R25TUhshr5c8BwQB/Gs7HbuWLhnrt/THBz5+yvmvBFB0pj6u/2UWAoUhTbqeJChgipG8O+8U7aO+G1XcPTdHz3gXkJHEuIsn9cj/eT3AyOY5xyU88jvXlaELQULHEk9RWvrzOjOfCU17BidkdlqHp68W2/2eNeLPNYm2+UjzI77K+JLifUH/DqOh58q7sVm1s9upqzaK9F22Ldu1geJMi1PPEN5PVaOvA5y+8BzGcg8sXr2f3V0huha3pWmZrq34qWzLivtFt2OVg4CgeR6EZSSOXWnccjXjIT+KVsjchPOc+3FiuSHVBLbaFLUScAADJJPaseZa1vyXX1kqLiyok+prUjxEaa1nrDbmTp3RdxhwZExfBLW+pSVLYweJCFAHBJwDntmqP6g8L28drSVtacRcEj/wCFltKP5FQP8K7ypVCWOdWW2zh2hW1KzDgtrkKbPn56qUBUWu7H7vNuFCtu9QnHdERSh+YqcPD9oXXNmssiLfdJ3iDhWEJfirTkd+oprpLmCX14/Kyv+XslNIPiyS0g4HlVfdeett/U/hbTjb/HzGMYJNWHTra0t6ai3eY7h11IQGRzWVfTrX5b77Nawu89u8WDTE18lCULYjxVFX1wB/8AypI8KXhsmWOVE1nuE3iYwUvW6zuDiEZech13txjkQkHkeZ5jAk+IfQe5rCDleGjBr1aGaQFpHcf8JI0T4ZNS6x1FE1JuVdGodncSHU2plazLCP2WnMpCWsjrwlSuo+U8029slst9ntzFutkNiHDjoDbLDKOFDaR0AA6CuwJAGK+gYpTJI6Vxc7utNDEyJgYwYAXqiijNcKVFcd6ucCzWuRdLpLYhwYzZcffeWEobSBzJJ6U1N1t0NHbbW1MvU9zDDrqFKjRG08b8gp7IQPflk4HqRVGN592tWbt3IiUtyz6ZaXmPamnSQrB5LcPLjV9RhPYDmTHJI1gyVHJKyMZcUreJPeuduzdxYbAqRC0hCdCklWULnLHRxYPRI/ZSfqeZwIyabS0gIQMAdKG0JbQG0J4UjoK/Vn5XkOdeEg4/Gks85lOUhsWOu76KSbFtnC/mz+ndVXY25LgCmEBAyoep5/SmQ6ldvuK1Wt51aEK+zeT8pP5dKnncnTZ19ou23fT0pKwywONhBzzHbFNrTGmU2Hb+8yr7F8p5xlSWQoYJI7/xrJVtVLmF8py4nG325wm0tLlrWNwAM7k33917rK0o/ZbtGRLeUnhQ+rqPrUV3iaIsYrH6xZwgf412qWcKcWcDGedNOfP+Jl+aE/K3nykk8s/vVqNM06Jjz024B7qjB1Lbx1DkBOPa/RE3X24to0fCUtL057ilvAZ8hsDicV9UoycZ5qIFak6etMGxWKDZrYwI8GDHRHjND9htCQlI9+QqBvBNtIrRWi3NWXxjh1BfkBfC4n7SNGzxJbOeYUo4Wocv2QeaasTitF2TkDC+0UUV6vUVzzosebEdiSmW32HkKbdbcTxJWhQwUkdwQa6DXmhCzX8Te0sravXY/RyHXNP3JSnbS+eflHPzR1H95OcAnqMH1wyLLPEpBSrKXUdR3rTjcvRNj3A0hN0zf2C5EkpyhaDhxhwfddQeyknmPXmDkEg5rbrbfai2u1vIsN2RxONguxZLaSG5jOcBxHoeXNPY8snrUFiEStwVWswCVn18JTbemXmTGgypq+EqCEqcUSEgnFLGvdJt6YcYbRcWpnmgHKD93686ZdrntTGg40rCx1GeYrvlypUko+JfU5wDCcnoKzskEkUgwcAeEkLmsa5krfUvyzmlyy6TvN4jqfhR+NtJxmku3QpE+SI8VtTrquiQOZp+7RxZk69Lsq71OtwSOMNtJyFFPMjHaoLk5hjLgeQuqlcSyNDxwUw58CVb5bkScwtl1BwUrTik/wCGkw5wuFmnybZMH3XIzpbPUHqk57CpB3t1HbdR6zW/amgGYzKY5cxguqTnKsdaYgzVipPIWNkPBPhEx+HnLYncBThtf4rtW6euKIW5EUXq0lvgEqIwlEpCgAAo8wlY9c4PfParOba70bd6+t5k2S/sNPIXwLhzlpYkIPb5FH5gfVORWevlKWkoWwpST1BTmk+ZZYcglQT5RPXhpszUG/vV2LUQB+oFq+hQWkKScg0FIPYVmTpPX+5+iLeiFpTW1xjQ2vuRV8LrSPZKHApIH0Ap3WPxM75WtwmZMtd4bUOHgmQEJx9C1wH+NXGWInfuV1tqF47rQgJA6AD8KMVR1rxfbmNoAf0hptw+qQ+P+8NenPF7uU4nDWkNOtn1UHj/AN4K76rP9gu+tGPKvBivLiktoUtakpSkEkk4AFZ+3/xPb3XF4LhvWezoAx5cSClYPvl0rP5EUy9Ybg7n60iqi6o1rNehuHK4rJS00v8ArIbCUn8RXBsRt7lcusxNGcq+m5G9W3WgYwXfNQxnJC/1cSGsPvr/ALKT8o91YH41WvcjxcajvEtyFtxaE2uEpJR8fPbC5JPqlGShP48R+lV3jWaC0eLgKz/SOadumtEX++JH6Kt5WjsokJT+dUp9TijbknH3VU3TJ6YhkptTTcLrc3brfrjJulweOXH5LpWonJPU/X6V0JOByHIUsao0nf8ATS0JvNvXHC/uqzlJP1qwe2sPRGodufOkW9kvsIy/hGSkjqazeq602rEJ8bwTjhQQVJbsxZI7BHuolf27L23bOqre6XXFDieR+4PpUeJq2O11jsKE3SNEui3rZKThLDmMN9j1qvm6un2dO6ulRI7gcYUsqbI/dpfpOrGzYkgf45H2Pj8KXUqLYY2yM/K5tK621Bpn5bXMUhsnJQTyNe9U63vupGUMXB9IaR+w2OEGm0BSLeLonBjRXcn/ADiuyRT6PT45Jd4YN3uqMb7Ew6bXHC57vcDKJabUUMJPzq9fapx8F2zKtbamb1rqGEVabtT2Y7TiflmyUkEDHdCORPYnA5jiFMrw97PXXdvU/koW7D09DVxXC48HMnrwIyMKcPL1CQcnsDpFpixWrTViiWSyQ24VuhtBqOw30QgdufMnqSTkkkkkk5rSxxiJuAncUTYm4CVBRRRXamRRRRXqEUUUUIXzFMjefbLT+6WkHLDfEFp5BLkKa2n7WI7+8n1B5BSTyI9CAQ+KKELKrczQGqts9ZuWa9xvKfyVR5Cchia3nAW2cfQEdQTg8+vFbbm1ITwuny3O4IrTrczQWmdxdNOaf1Tb0y4ijxNrHyusL7LbV+yofkRkEEEis+d/dkdU7VXFUmUly56fWvhiXhlB+zBzwoeT+yr36HsewgnhEowVWs1mzjBSZp26v2S8RrpFCFrYWFgHofY/xqTdP7k6VgXN3UDlrlN3JxC8pQBw8RHY1AkG8OMpSiWONCvuOA8lfj/hS0lbTqAtpxKgewPSs7d0qOU/qZ/CXxTT0cswCF13KUJtykzAy2yH3VOcCBhKSTnAHpTj2n01/OrWsK1OBRjqWFPBPUpFNMcqeO0Oq2dH6xj3aQjjZHyOADnwkYNQXRKKzxD82OFUrljrAMnYlSZrnXtk0xqwact+n4jsCKvyXlcGFqHfFNvfnR9usbsO82httiLObDpaB6FQyDTzhaV0BqvV5vIv7DyZTvneQVYUeecHn9KaniWvyJ2o2LJFSpMSE0AnsFfT8qzFB+LUUUIIIB35zz/P1Wgtxhldxkxj9uE2IGhHpe369V+elttGeRT1x70haT0pfdTJfXbEoW2wnKyT0qZFtvf+TTG+HaKvlIXwjonJz+FePD3EFm25v16ltqaTk4URjPCOdXBq0kcErzyQ/aAqzqERkYPBbkqFbPYbhd7ybXFQPPSspUFcsEe1OKbtne4T/kSH4jbnCCUqcAI/Ou/Y90SNy0vPKwp51Svpkk/409d5F2RvXUgy3i3I8lvp2+Wp7epTsuCu0cbc9lxXqQmAyOGcHChlq1Fu+m2S3QhSV8KilXy/nUpaJ2+0te5wt65rjrmOJRbX0HvUX3oNPXdwxTx+YoAVN+m7PO0Nt67OYjmReZ4+UJGeAkYwa81exIyFgY/a53A8crjToWukflmQOc+yjPX1htFo3E/QVsfLsVBQlfPmDnnzqR953pWldIWa32Djjx3T87zaeYAA5Y/OohvtpvcFabvcmnWluuFXER371KOnN0LDc9ItWHWMVLxa5Ic4cj61DahmxBI39QM+Ye/1UtZ0bXSRuGwu7Fd6LmrWuycpd4Zy/DOA5jBVgVHezWrk6YvLjMwqXBf+zcGe3rShq/cK2jTy9PaZimJEKsqUP2vwqLwanoabvgljlbhrzkD2UVq26KVrmnJHlPDWt+LOspcvTk16PFWriSlCsDNNmfcX5chUic+tZPVSjnFcEqbHiZDisqHVNIFxnSJWA+ryWs5Daep9M1o6mnYw3Hbz5VdrJbZO7gLtut08zjYjKwgffd9BTs2I2f1HuxqH4O3FcGysK/5wuK0EpQP3R+84eyew5nljLu8PPh21HuY5FvOoPiLJpIK4g4E4emD/AOSCPun/AEhGPTPPF+9IabsmkrBGsOnbezb7bFTwssNA4TzJJJPMqJJJUeZPWnsUTY24CaQQNhbgL8NCaUseidLw9N6dhJiW+IjhQkfeWe61H9pRPMml2vooqRToooooQiiiihCKKKKEIooooQiuW4wolwhPQp8ViXEfbU28w+2FtuIUMFKknkQRywa6qDQhU83v8JjyXXr3tU41wrPG/YZTnyKPfyVqOB2+VZ5c8K6JFT7hBudjuT9ulRpNpuUdwodhy0FtaT2HPHqOoHUda1z6UzNytsNE7jW34PVlkYmKSkpZlJHlyGB6IcT8wGeeOh7g0YXjmh3dZjx742FhuYythY5KJ/4UqtuNvJCmnErHsam7c/wjausqHZehp7Wo4AJULfMCWpSE+gOQhffmCgnsKrjqSxXrTNxdgXy03GyXFHP4eU0pGfdIVzx75OapS1GuORwl8unMcctOE5oz8iLIRIjOqadQflUk4IrqudylXJ8SJi+N3GCo9TTMj3G4tMJcHlyG/Xqf+NdqL60n9fHcbz0PrVF9B+Q7GSqUtKw1u3OQpQ0XuZetMQF2xDLEyCsHLLwyOfXFd2r92brfdOKsMW2x7VCXnzEsK+97dOlRSzd4DmfteE/0hXSiZEV/7w2Pxpa7Sq/U6jo/V3/K7+JttjEeDgcfhLulb2/YL0zc4yQpxpXEATyp/XzdSzXqQZVy0jFfkFISXFKySB0qKwpnP69B+hr6txhIBU+gfWuZqEUzxI8epRQ3JoBtb/SWbneo8m7idBgNw0JUFJabPIU5bzupqO4RG4pWhDaABjGajpc6Eg/NIbH41yKvkBP7aj9BUztNZKQXMzhewyWgXGPIynNer/drukIny1ONg5COwpMHOkKXfXMFDUZaR6qGc1xXKRPUU/GP+UVJ4gjqce9MIdPcBjGApBSnmdukKX5s6JGyFPBax+ykZpKlXSbKbPkJ8hlPVfQf+P0FdmjNJ6l1bczD0dpq4Xt9JwVBklLfupXJKB7qIqyu1fg4nyvIn7lX4sNpVk2y3LClkfurdPyp9wkK9lCr0dRje6vRUI2HLuSqx6V05f8AVt+asmlbRMvNzc5/ZoyUpyBxEn5UJGRlSiAOXMVcjYXwoWjT7rGoNxXI99u6cKbgD7SGwccuPP61Q9DhI9FcjVhNDaN0zoizJtGlrNEtcMHKkso+Zw9OJaj8y1YwOJRJ5dacFWQMK2vDTaGm0ttpSlKQAAkYAA7V+lFFdLpFFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRRQhFFFFCEUl6i0/ZNRW9Vvv1ogXSKr/MzI6HkZ9eFQIz70qUUIVfNc+Enay/Fb9mbuOm5RBIMN8uNFR7qQ7xcvZJTUOal8HWu7eP8Azc1ZZruwByRNacjL+gA4x+ORV5qKELM69+H7eazqUJG3zstI6LhONSAR64Qon8CAaaV00Jre3Y/SG3WpImc4LttfQDjrj5OdavGvmKELIp+y3ZtXCrT12bI7KiuD/CvcWwXt1fCjTF5dPoiG4T/2a1yxRijC8wFlXbNtdxLk2P0ftnqV3j6Ofo14IH9oox/Gnjpzw271XZ1C/wCaDNta7PTpDLePqjiK/wDZrSPFfcUL1Um014MtSTSh3V2toUUHmWrdGW+cenEsoA/1TU16G8Lu0emnG5D1lfv0ps5S7dnfNT9C2kJbIz6pNTdRQhclqtsG1QW4NuiR4kVoYbZjtBttA9AkcgK66KKEIooooQiiiihCKKKKEIooooQiiiihC//Z";


/* -------------------- TIME HELPERS -------------------- */
function formatPH(ms) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(ms));
}

function phYMD(ms) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date(ms))
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
}

function dateKeyPH(ms) {
  const { y, m, d } = phYMD(ms);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthKeyPH(ms) {
  const { y, m } = phYMD(ms);
  return `${y}-${String(m).padStart(2, "0")}`;
}

function phStartOfDayMs(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0) - PH_OFFSET_MS;
}
function phEndOfDayMs(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d, 23, 59, 59, 999) - PH_OFFSET_MS;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatHoursMinutes(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

// Always 2 digits (00h 10m)
function formatHoursMinutes2(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${pad2(h)}h ${pad2(m)}m`;
}

// hours + minutes + seconds (counting)
function formatHMS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${pad2(m)}m ${pad2(s)}s`;
}

// Time only (no date) — for attendance log
function formatTimePH(ms) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(ms));
}

function hoursFromMs(ms) {
  return ms / (1000 * 60 * 60);
}

/* -------------------- PER-EMPLOYEE SCHEDULE + LATE -------------------- */
function getScheduleHM(emp) {
  const t = String(emp?.scheduleTime || "").trim();
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (m) {
    const hour = Math.max(0, Math.min(23, Number(m[1])));
    const minute = Math.max(0, Math.min(59, Number(m[2])));
    return { hour, minute };
  }
  return { hour: 8, minute: 0 };
}

function scheduleUtcMsFor(timeInMs, emp) {
  const { y, m, d } = phYMD(timeInMs);
  const { hour, minute } = getScheduleHM(emp);
  return Date.UTC(y, m - 1, d, hour - 8, minute, 0, 0);
}

function lateInfo(timeInMs, emp) {
  const schedUtcMs = scheduleUtcMsFor(timeInMs, emp);
  const diff = timeInMs - schedUtcMs;
  if (diff > 0) return { statusText: `LATE (${formatHoursMinutes2(diff)})`, lateMs: diff };
  return { statusText: "ON-TIME", lateMs: 0 };
}

/* -------------------- INPUT -------------------- */
function TextInput(props) {
  return <input {...props} />;
}

/* -------------------- WRAPPERS OUTSIDE APP -------------------- */
const Shell = ({ children }) => (
  <div className="page">
    <div className="container">{children}</div>
  </div>
);

const TopBar = ({ user, menuOpen, setMenuOpen, openProfile, logout, fullNameOf }) => {
  const fullName = fullNameOf(user) || "NO NAME";
  const initials = (user?.firstName?.[0] || "U") + (user?.lastName?.[0] || "");

  return (
    <>
      {menuOpen && <div className="menuBackdrop" onClick={() => setMenuOpen(false)} />}
      <div className="topbar">
        <div className="brand">
          <div className="avatar topAvatar">
            {user?.photo ? (
              <img src={user.photo} alt="Profile" className="avatarImg" />
            ) : (
              <div className="avatarInitials">{initials.toUpperCase()}</div>
            )}
          </div>
          <div className="brandText">
            <div className="brandTitle">{fullName.toUpperCase()}</div>
            <div className="brandSub">
              {user?.role?.toUpperCase()} • ID: <b>{user?.id}</b>
            </div>
          </div>
        </div>

        <div className="accountWrap">
          <button type="button" className="chip" onClick={() => setMenuOpen((v) => !v)}>
            Account <span className="caret">▾</span>
          </button>

          {menuOpen && (
            <div className="menu">
              <button
                type="button"
                className="menuItem"
                onClick={() => {
                  openProfile();
                  setMenuOpen(false);
                }}
              >
                {user?.role === "admin" ? "Edit My Profile" : "My Profile"}
              </button>
              <button type="button" className="menuItem danger" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const ProfileView = ({ editForm, setEditForm, user, saveProfile, setView, handlePhotoUpload }) => (
  <>
    <div className="sectionTitle">Edit Profile</div>

    {user.role === "employee" && (
      <div className="profile-notice-box">
        Name, ID, and photo can only be changed by an Admin.
      </div>
    )}

    <div className="grid2">
      {/* Name fields — admin only */}
      {[["firstName", "First Name"], ["middleName", "Middle Name"], ["lastName", "Last Name"]].map(([k, label]) => (
        <div className="field" key={k}>
          <div className="label">{label}</div>
          {user.role === "admin" ? (
            <TextInput value={editForm[k]} onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })} />
          ) : (
            <div className="profile-disabled-input">
              {editForm[k] || "—"}
            </div>
          )}
        </div>
      ))}

      <div className="field">
        <div className="label">Age</div>
        <TextInput
          value={String(editForm.age ?? "")}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Age"
          onChange={(e) => setEditForm({ ...editForm, age: numbersOnly(e.target.value) })}
        />
      </div>

      <div className="field">
        <div className="label">Sex</div>
        <select value={editForm.sex} onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}>
          <option value="">Select Sex</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>

      <div className="field">
        <div className="label">Phone Number (11 digits)</div>
        <TextInput
          value={editForm.phone}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="09XXXXXXXXX"
          onChange={(e) => setEditForm({ ...editForm, phone: numbersOnly(e.target.value).slice(0, 11) })}
        />
      </div>

      {user.role === "employee" && (
        <div className="field">
          <div className="label">Position</div>
          <TextInput value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
        </div>
      )}

      {/* Photo — admin only */}
      <div className="field">
        <div className="label">{user.role === "admin" ? "Admin" : "Employee"} Picture</div>
        {user.role === "admin" ? (
          <>
            <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
            <button className="btn ghost" type="button" onClick={() => setEditForm({ ...editForm, photo: "" })}>
              Remove Picture
            </button>
          </>
        ) : (
          <div className="profile-disabled-note">
            Contact an Admin to update your photo.
          </div>
        )}

        <div className="mt10">
          {editForm.photo ? (
            <img
              src={editForm.photo}
              alt="Preview"
              className="preview120"
            />
          ) : (
            <div className="muted">No photo</div>
          )}
        </div>
      </div>
    </div>

    <div className="actionsRowWide">
      <button className="btn primary" onClick={saveProfile}>
        Save Profile
      </button>
      <button className="btn ghost" onClick={() => setView("attendance")}>
        Back
      </button>
    </div>
  </>

);

/* -------------------- APP -------------------- */
export default function App() {
  const [page, setPage] = useState("login"); // login | signup | employee | admin
  const [initializing, setInitializing] = useState(true);
  const [role, setRole] = useState("employee"); // employee | admin
  const [id, setId] = useState("");
  const [user, setUser] = useState(null);
  const [showQuickAction, setShowQuickAction] = useState(false); // show Time In/Break/Out panel on home

  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState("attendance"); // attendance | profile

  // Admin UI
  const [adminTab, setAdminTab] = useState("folders"); // folders | employees | admins | trash

const [isExporting, setIsExporting] = useState(false);
const [exportMsg, setExportMsg] = useState("");

const startExport = (msg) => {
  setIsExporting(true);
  setExportMsg(msg || "Exporting...");
  window.setTimeout(() => {
    setIsExporting(false);
    setExportMsg("");
  }, 1500);
};

const downloadFile = (url, msg) => {
  startExport(msg);
  window.location.href = url;
};

const monthRangeFromKey = (monthKey) => {
  const m = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]); // 1-12
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}` };
};

  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [empSearch, setEmpSearch] = useState("");

  // Daily folders date search (DATE PICKER like your screenshot)
  const [folderDatePick, setFolderDatePick] = useState("");

  // Expand/collapse per folder
  const [expandedDates, setExpandedDates] = useState(() => new Set());

  // Admin filters
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [monthPick, setMonthPick] = useState("");

  // refresh usersMap after saving schedule
  const [storageTick, setStorageTick] = useState(0);

  // admin edits schedule time here
  const [empWorkTime, setEmpWorkTime] = useState("08:00");

  // Signup form
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    age: "",
    position: "",
    sex: "",
    phone: "",
    photo: "",
  });

  const [records, setRecords] = useState(JSON.parse(localStorage.getItem("records") || "[]"));
  const [breaks, setBreaks] = useState(JSON.parse(localStorage.getItem("breaks") || "[]"));

  // Trash (Undo)
  const [trashEmployees, setTrashEmployees] = useState(JSON.parse(localStorage.getItem("trash_employees") || "[]"));
  const [trashRecords, setTrashRecords] = useState(JSON.parse(localStorage.getItem("trash_records") || "[]"));
  const [trashAdmins, setTrashAdmins] = useState(JSON.parse(localStorage.getItem("trash_admins") || "[]"));

  // Admin edit employee/admin modal state
  const [editTarget, setEditTarget] = useState(null); // { user, role }
  const [editTargetForm, setEditTargetForm] = useState(null);
  const [editTargetSaving, setEditTargetSaving] = useState(false);

  const [editForm, setEditForm] = useState(null);

  useEffect(() => localStorage.setItem("records", JSON.stringify(records)), [records]);
  useEffect(() => localStorage.setItem("breaks", JSON.stringify(breaks)), [breaks]);
  useEffect(() => localStorage.setItem("trash_employees", JSON.stringify(trashEmployees)), [trashEmployees]);
  useEffect(() => localStorage.setItem("trash_records", JSON.stringify(trashRecords)), [trashRecords]);
  useEffect(() => localStorage.setItem("trash_admins", JSON.stringify(trashAdmins)), [trashAdmins]);


  // ── fingerprint state for login/signup ──────────────────────
  const [fpTemplate, setFpTemplate] = useState(null);   // login: single scan
  const [fpScans, setFpScans]       = useState([]);     // signup: array of 3 scan results
  const [fpSource, setFpSource]     = useState(null);
  const [fpError, setFpError]       = useState("");
  const [fpLoading, setFpLoading]   = useState(false);

  // Legacy compat shim
  const fingerprint = () => true;

  const fullNameOf = (u) => [u?.firstName, u?.middleName, u?.lastName].filter(Boolean).join(" ").trim();

  // Load users
  const usersMap = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("employee_") || k.startsWith("admin_")) {
        try {
          const u = JSON.parse(localStorage.getItem(k));
          if (u?.id) map.set(u.role + "_" + u.id, u);
        } catch {}
      }
    }
    return map;
  }, [user, page, records, trashEmployees, trashRecords, trashAdmins, storageTick]);

  // always use latest saved user (so schedule updates apply without re-login)
  const currentUser = useMemo(() => {
    if (!user) return null;
    return usersMap.get(user.role + "_" + user.id) || user;
  }, [user, usersMap]);

  const allEmployees = useMemo(() => {
    const out = [];
    usersMap.forEach((u, key) => {
      if (key.startsWith("employee_")) out.push(u);
    });
    out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return out;
  }, [usersMap]);

  const allAdmins = useMemo(() => {
    const out = [];
    usersMap.forEach((u, key) => {
      if (key.startsWith("admin_")) out.push(u);
    });
    out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return out;
  }, [usersMap]);

  /* -------------------- OPTIONAL CLOUD SYNC (Backend + DB) --------------------
     - Does NOT change UI behavior.
     - If server is running, it mirrors localStorage -> SQLite DB via /api/sync.
     - If offline / error, it silently skips.
  */
  const lastSyncRef = React.useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastSyncRef.current < 1200) return; // debounce
    lastSyncRef.current = now;

    const usersPayload = [
      ...allEmployees.map((e) => ({
        id: String(e.id || ""),
        role: "employee",
        firstName: e.firstName || "",
        middleName: e.middleName || null,
        lastName: e.lastName || "",
        age: e.age ? Number(e.age) : null,
        position: e.position || null,
        sex: e.sex || null,
        phone: e.phone || null,
        photo: e.photo || null,
        scheduleTime: e.scheduleTime || "08:00",
      })),
      ...allAdmins.map((a) => ({
        id: String(a.id || ""),
        role: "admin",
        firstName: a.firstName || "",
        middleName: a.middleName || null,
        lastName: a.lastName || "",
        age: a.age ? Number(a.age) : null,
        position: a.position || null,
        sex: a.sex || null,
        phone: a.phone || null,
        photo: a.photo || null,
        scheduleTime: a.scheduleTime || "08:00",
      })),
    ].filter((u) => u.id && u.firstName && u.lastName);

    const recordsPayload = (records || [])
      .map((r) => {
        // Find breaks associated with this session (same user ID/role, starting after timeIn)
        const recordBreaks = (breaks || []).filter(
          (b) =>
            String(b.id) === String(r.id) &&
            b.role === r.role &&
            b.breakStart >= r.timeIn &&
            (!r.timeOut || b.breakStart <= r.timeOut)
        );
        // Take the earliest break in this session
        const firstBreak = recordBreaks.sort((a, b) => a.breakStart - b.breakStart)[0];

        return {
          id: String(r.id || ""),
          role: r.role || "employee",
          timeIn: Number(r.timeIn),
          timeOut: r.timeOut ? Number(r.timeOut) : null,
          breakIn: firstBreak ? Number(firstBreak.breakStart) : null,
          breakOut: firstBreak && firstBreak.breakEnd ? Number(firstBreak.breakEnd) : null,
        };
      })
      .filter((r) => r.id && Number.isFinite(r.timeIn));

    const controller = new AbortController();
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users: usersPayload, records: recordsPayload }),
      signal: controller.signal,
    }).catch(() => {});

    return () => controller.abort();
  }, [records, allEmployees, allAdmins]);

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return allEmployees;
    return allEmployees.filter((emp) => {
      const name = fullNameOf(emp).toLowerCase();
      const empId = String(emp.id || "").toLowerCase();
      return name.includes(q) || empId.includes(q);
    });
  }, [allEmployees, empSearch]);

  const filteredAdmins = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return allAdmins;
    return allAdmins.filter((adm) => {
      const name = fullNameOf(adm).toLowerCase();
      const admId = String(adm.id || "").toLowerCase();
      return name.includes(q) || admId.includes(q);
    });
  }, [allAdmins, empSearch]);

  const employeeRecords = useMemo(() => records.filter((r) => r.role === "employee"), [records]);

  // any active record (for admin live counter)
  const hasAnyActiveRecord = useMemo(() => employeeRecords.some((r) => !r.timeOut), [employeeRecords]);

  // Admin daily folders (PH date)
  const dailyFolders = useMemo(() => {
    const map = new Map();
    for (const r of employeeRecords) {
      const k = dateKeyPH(r.timeIn);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.timeIn - b.timeIn);
      map.set(k, arr);
    }
    const dates = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return { map, dates };
  }, [employeeRecords]);

  // Filter daily folders by date picker (exact date only)
  const filteredFolderDates = useMemo(() => {
    const q = String(folderDatePick || "").trim();
    if (!q) return dailyFolders.dates;
    return dailyFolders.dates.filter((d) => d === q);
  }, [dailyFolders.dates, folderDatePick]);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmpId) return null;
    return usersMap.get("employee_" + selectedEmpId) || null;
  }, [selectedEmpId, usersMap]);

  // load selected employee schedule into time input
  useEffect(() => {
    if (!selectedEmployee) return;
    setEmpWorkTime(selectedEmployee.scheduleTime || "08:00");
  }, [selectedEmployee?.id]);

  const selectedEmployeeAttendanceAll = useMemo(() => {
    if (!selectedEmpId) return [];
    return employeeRecords
      .filter((r) => String(r.id) === String(selectedEmpId))
      .sort((a, b) => b.timeIn - a.timeIn);
  }, [selectedEmpId, employeeRecords]);

  const selectedEmployeeMonths = useMemo(() => {
    const set = new Set();
    for (const r of selectedEmployeeAttendanceAll) set.add(monthKeyPH(r.timeIn));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [selectedEmployeeAttendanceAll]);

  const selectedEmployeeAttendanceFiltered = useMemo(() => {
    let logs = [...selectedEmployeeAttendanceAll];

    if (monthPick) logs = logs.filter((r) => monthKeyPH(r.timeIn) === monthPick);

    const fromMs = phStartOfDayMs(filterFrom);
    const toMs = phEndOfDayMs(filterTo);
    if (fromMs != null) logs = logs.filter((r) => r.timeIn >= fromMs);
    if (toMs !=null) logs = logs.filter((r) => r.timeIn <= toMs);

    return logs;
  }, [selectedEmployeeAttendanceAll, filterFrom, filterTo, monthPick]);

  const selectedEmployeeDailyBreakdown = useMemo(() => {
    const map = new Map();
    for (const r of selectedEmployeeAttendanceFiltered) {
      const k = dateKeyPH(r.timeIn);
      if (!r.timeOut) continue;
      const dur = Math.max(0, r.timeOut - r.timeIn);
      if (!map.has(k)) map.set(k, { totalMs: 0, logs: [] });
      const obj = map.get(k);
      obj.totalMs += dur;
      obj.logs.push(r);
    }
    const dates = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return { map, dates };
  }, [selectedEmployeeAttendanceFiltered]);

  const selectedEmployeeTotals = useMemo(() => {
    const daySet = new Set();
    let totalMs = 0;
    for (const r of selectedEmployeeAttendanceFiltered) {
      daySet.add(dateKeyPH(r.timeIn));
      if (r.timeOut) totalMs += Math.max(0, r.timeOut - r.timeIn);
    }
    return { daysPresent: daySet.size, totalMs, totalHours: hoursFromMs(totalMs) };
  }, [selectedEmployeeAttendanceFiltered]);

  const myRecords = useMemo(() => {
    if (!currentUser) return [];
    return records
      .filter((r) => String(r.id) === String(currentUser.id) && r.role === currentUser.role)
      .sort((a, b) => b.timeIn - a.timeIn);
  }, [records, currentUser]);

  const myActiveSession = useMemo(() => {
    if (!currentUser) return null;
    const mine = records
      .filter((r) => r.role === currentUser.role && String(r.id) === String(currentUser.id))
      .sort((a, b) => b.timeIn - a.timeIn);
    if (mine[0] && !mine[0].timeOut) return mine[0];
    return null;
  }, [records, currentUser]);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data && data.session) {
            const { username, role } = data.session;
            let userData = null;
            const cached = localStorage.getItem(role + "_" + username);
            if (cached) {
              try { userData = JSON.parse(cached); } catch {}
            }
            if (!userData) {
              const uRes = await fetch("/api/bootstrap");
              const uData = await uRes.json().catch(() => null);
              userData = (uData?.users || []).find((u) => u.id === username) || null;
              if (userData) {
                localStorage.setItem(role + "_" + username, JSON.stringify(userData));
              }
            }
            if (!userData) {
              userData = { id: username, role: role, firstName: "User", lastName: username, scheduleTime: "08:00" };
            }
            setUser(userData);
            setPage(role);
            if (role === "employee") {
              setShowQuickAction(true);
            }
          }
        }
      } catch (err) {
        console.error("Session check failed", err);
      } finally {
        setInitializing(false);
      }
    };
    checkSession();
  }, []);

  // Bootstrap database data to localStorage on mount
  useEffect(() => {
    const bootstrapData = async () => {
      try {
        const res = await fetch("/api/bootstrap");
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        // 1. Sync users to localStorage
        if (Array.isArray(data.users)) {
          data.users.forEach((u) => {
            if (u.id && u.role) {
              const key = u.role + "_" + u.id;
              if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify(u));
              }
            }
          });
        }

        // 2. Sync records and breaks to state + localStorage
        if (Array.isArray(data.records)) {
          const localRecords = JSON.parse(localStorage.getItem("records") || "[]");
          const localBreaks = JSON.parse(localStorage.getItem("breaks") || "[]");

          let updatedRecords = [...localRecords];
          let updatedBreaks = [...localBreaks];
          let recordsChanged = false;
          let breaksChanged = false;

          data.records.forEach((dbRec) => {
            const dbTimeInMs = new Date(dbRec.timeIn).getTime();
            const dbTimeOutMs = dbRec.timeOut ? new Date(dbRec.timeOut).getTime() : null;

            const exists = localRecords.some(
              (lr) =>
                String(lr.id) === String(dbRec.userId) &&
                lr.role === dbRec.role &&
                Math.abs(lr.timeIn - dbTimeInMs) < 5000
            );

            if (!exists) {
              updatedRecords.push({
                id: dbRec.userId,
                role: dbRec.role,
                timeIn: dbTimeInMs,
                timeOut: dbTimeOutMs,
              });
              recordsChanged = true;
            }

            if (dbRec.breakIn) {
              const dbBreakStartMs = new Date(dbRec.breakIn).getTime();
              const dbBreakEndMs = dbRec.breakOut ? new Date(dbRec.breakOut).getTime() : null;

              const breakExists = localBreaks.some(
                (lb) =>
                  String(lb.id) === String(dbRec.userId) &&
                  lb.role === dbRec.role &&
                  Math.abs(lb.breakStart - dbBreakStartMs) < 5000
              );

              if (!breakExists) {
                updatedBreaks.push({
                  id: dbRec.userId,
                  role: dbRec.role,
                  breakStart: dbBreakStartMs,
                  breakEnd: dbBreakEndMs,
                });
                breaksChanged = true;
              }
            }
          });

          if (recordsChanged) {
            setRecords(updatedRecords);
            localStorage.setItem("records", JSON.stringify(updatedRecords));
          }
          if (breaksChanged) {
            setBreaks(updatedBreaks);
            localStorage.setItem("breaks", JSON.stringify(updatedBreaks));
          }
        }
        setStorageTick((t) => t + 1);
      } catch (err) {
        console.error("Failed to bootstrap data", err);
      }
    };
    bootstrapData();
  }, []);

  /* TIMER: Always counting — timestamps are persistent in localStorage so
     the real-time counter stays accurate even after logout / page switch */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 15-second auto-logout/inactivity timer for employee account page
  useEffect(() => {
    if (!currentUser || currentUser.role !== "employee") return;

    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
      }, 15000); // 15 seconds
    };

    resetTimer();

    const events = ["mousedown", "click", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timer);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser]);

  const myActiveDurationText = useMemo(() => {
    if (!myActiveSession) return "";
    const durMs = Math.max(0, now - myActiveSession.timeIn);
    return formatHMS(durMs);
  }, [myActiveSession, now]);

  // Break helpers
  const myActiveBreak = useMemo(() => {
    if (!currentUser) return null;
    const mine = breaks
      .filter((b) => b.role === currentUser.role && String(b.id) === String(currentUser.id))
      .sort((a, b) => b.breakStart - a.breakStart);
    if (mine[0] && !mine[0].breakEnd) return mine[0];
    return null;
  }, [breaks, currentUser]);

  const myBreakDurationText = useMemo(() => {
    if (!myActiveBreak) return "";
    const durMs = Math.max(0, now - myActiveBreak.breakStart);
    return formatHMS(durMs);
  }, [myActiveBreak, now]);

  const myBreaksForSession = useMemo(() => {
    if (!currentUser || !myActiveSession) return [];
    return breaks.filter(
      (b) =>
        b.role === currentUser.role &&
        String(b.id) === String(currentUser.id) &&
        b.breakStart >= myActiveSession.timeIn
    );
  }, [breaks, currentUser, myActiveSession]);

  const totalBreakMsForSession = useMemo(() => {
    return myBreaksForSession.reduce((acc, b) => {
      if (b.breakEnd) return acc + Math.max(0, b.breakEnd - b.breakStart);
      return acc + Math.max(0, now - b.breakStart);
    }, 0);
  }, [myBreaksForSession, now]);

  const miniBtn = {
    width: 26,
    height: 26,
    minWidth: 26,
    borderRadius: 8,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    lineHeight: 1,
  };

  // small centered action buttons (collapse/expand + print)
  const smallActionBtnStyle = {
    height: 38,
    padding: "0 14px",
    borderRadius: 12,
    minWidth: 120,
    maxWidth: 180,
  };

  const toggleFolder = (date) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  /* -------------------- DELETE / RESTORE -------------------- */
  const adminDeleteEmployeeAccount = async (empIdToDelete) => {
    if (currentUser?.role !== "admin") return;
    const ok = window.confirm("Delete this employee account?\nThis will permanently remove their account, fingerprints, and all data from the database.");
    if (!ok) return;

    // Delete from database — cascades fingerprints, credentials, attendance records
    try {
      const res = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: String(empIdToDelete) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        return alert("Delete failed: " + (d?.error || "Server error"));
      }
    } catch (e) { return alert("Network error. Try again."); }

    const emp = usersMap.get("employee_" + empIdToDelete);
    if (emp) setTrashEmployees((prev) => [{ deletedAt: Date.now(), payload: emp }, ...prev]);
    // Remove ALL localStorage keys related to this user
    localStorage.removeItem("employee_" + empIdToDelete);
    localStorage.removeItem("admin_" + empIdToDelete);

    const empRecs = records.filter((r) => r.role === "employee" && String(r.id) === String(empIdToDelete));
    if (empRecs.length) {
      setTrashRecords((prev) => [
        { deletedAt: Date.now(), type: "employeeRecords", empId: String(empIdToDelete), payload: empRecs },
        ...prev,
      ]);
    }
    setRecords((prev) => prev.filter((r) => !(r.role === "employee" && String(r.id) === String(empIdToDelete))));
    if (String(selectedEmpId) === String(empIdToDelete)) setSelectedEmpId("");
  };

  const adminDeleteOneRecord = (rec) => {
    if (currentUser?.role !== "admin") return;
    const ok = window.confirm("Delete this attendance record? (Can restore in Trash)");
    if (!ok) return;

    setTrashRecords((prev) => [{ deletedAt: Date.now(), type: "record", payload: rec }, ...prev]);

    setRecords((prev) =>
      prev.filter(
        (r) =>
          !(
            r.role === rec.role &&
            String(r.id) === String(rec.id) &&
            r.timeIn === rec.timeIn &&
            r.timeOut === rec.timeOut
          )
      )
    );
  };

  const adminDeleteAdminAccount = async (adminIdToDelete) => {
    if (currentUser?.role !== "admin") return;
    const ok = window.confirm("Delete this admin account?\nThis will permanently remove their account, fingerprints, and all data from the database.");
    if (!ok) return;

    // Delete from database
    try {
      const res = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: String(adminIdToDelete) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        return alert("Delete failed: " + (d?.error || "Server error"));
      }
    } catch (e) { return alert("Network error. Try again."); }

    const adm = usersMap.get("admin_" + adminIdToDelete);
    if (adm) setTrashAdmins((prev) => [{ deletedAt: Date.now(), payload: adm }, ...prev]);
    // Remove ALL localStorage keys for this user
    localStorage.removeItem("admin_" + adminIdToDelete);
    localStorage.removeItem("employee_" + adminIdToDelete);
    setStorageTick((t) => t + 1);
    alert("Admin account deleted from database.");
  };

  // ─── Admin edit any user (employee or admin) ──────────────────────────────
  const adminOpenEditUser = (targetUser) => {
    setEditTarget(targetUser);
    setEditTargetForm({
      firstName:   targetUser.firstName   || "",
      middleName:  targetUser.middleName  || "",
      lastName:    targetUser.lastName    || "",
      age:         String(targetUser.age  || ""),
      sex:         targetUser.sex         || "",
      phone:       targetUser.phone       || "",
      position:    targetUser.position    || "",
      scheduleTime:targetUser.scheduleTime|| "08:00",
      photo:       targetUser.photo       || "",
    });
  };

  const adminCloseEditUser = () => {
    setEditTarget(null);
    setEditTargetForm(null);
  };

  const adminSaveEditTarget = async () => {
    if (!editTarget || !editTargetForm) return;
    if (!editTargetForm.firstName.trim() || !editTargetForm.lastName.trim())
      return alert("First and Last name are required.");
    if (!String(editTargetForm.age).trim() || isNaN(Number(editTargetForm.age)))
      return alert("Valid age is required.");
    if (!editTargetForm.sex.trim())
      return alert("Sex is required.");
    if (!editTargetForm.phone.trim() || editTargetForm.phone.length !== 11)
      return alert("Phone must be exactly 11 digits.");
    if (editTarget.role === "employee" && !editTargetForm.position.trim())
      return alert("Position is required for employees.");

    setEditTargetSaving(true);
    try {
      const res = await fetch("/api/users/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:       editTarget.id,
          firstName:    editTargetForm.firstName.trim(),
          middleName:   editTargetForm.middleName.trim() || null,
          lastName:     editTargetForm.lastName.trim(),
          age:          Number(editTargetForm.age),
          sex:          editTargetForm.sex.trim(),
          phone:        editTargetForm.phone.trim(),
          position:     editTargetForm.position.trim() || null,
          scheduleTime: editTargetForm.scheduleTime || "08:00",
          photo:        editTargetForm.photo || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return alert("Save failed: " + (data?.error || "Unknown error"));

      // Update local state
      const updated = { ...editTarget, ...editTargetForm };
      const key = editTarget.role + "_" + editTarget.id;
      localStorage.setItem(key, JSON.stringify(updated));
      setStorageTick((t) => t + 1);
      alert("Profile updated successfully!");
      adminCloseEditUser();
    } catch (e) {
      alert("Network error. Try again.");
    } finally {
      setEditTargetSaving(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const restoreTrashEmployee = (trashItem) => {
    if (currentUser?.role !== "admin") return;
    const emp = trashItem?.payload;
    if (!emp?.id) return;

    localStorage.setItem("employee_" + emp.id, JSON.stringify(emp));
    setTrashEmployees((prev) => prev.filter((x) => x !== trashItem));
    setStorageTick((t) => t + 1);
    alert("Employee restored!");
  };

  const restoreTrashAdmin = (trashItem) => {
    if (currentUser?.role !== "admin") return;
    const adm = trashItem?.payload;
    if (!adm?.id) return;

    localStorage.setItem("admin_" + adm.id, JSON.stringify(adm));
    setTrashAdmins((prev) => prev.filter((x) => x !== trashItem));
    setStorageTick((t) => t + 1);
    alert("Admin restored!");
  };

  const restoreTrashRecordItem = (trashItem) => {
    if (currentUser?.role !== "admin") return;

    if (trashItem.type === "record") {
      setRecords((prev) => [trashItem.payload, ...prev]);
      setTrashRecords((prev) => prev.filter((x) => x !== trashItem));
      alert("Record restored!");
      return;
    }

    if (trashItem.type === "employeeRecords" && Array.isArray(trashItem.payload)) {
      setRecords((prev) => [...trashItem.payload, ...prev]);
      setTrashRecords((prev) => prev.filter((x) => x !== trashItem));
      alert("Employee records restored!");
      return;
    }
  };

  const clearTrash = () => {
    if (currentUser?.role !== "admin") return;
    const ok = window.confirm("Permanently clear Trash? This cannot be undone.");
    if (!ok) return;
    setTrashEmployees([]);
    setTrashRecords([]);
    setTrashAdmins([]);
  };

  /* -------------------- ADMIN: SAVE EMPLOYEE SCHEDULE -------------------- */
  const adminSaveEmployeeSchedule = () => {
    if (currentUser?.role !== "admin") return;
    if (!selectedEmployee) return;

    const m = String(empWorkTime || "").match(/^(\d{2}):(\d{2})$/);
    if (!m) return alert("Invalid time. Use HH:MM (example 10:00).");

    const updated = { ...selectedEmployee, scheduleTime: empWorkTime };
    localStorage.setItem("employee_" + updated.id, JSON.stringify(updated));

    setStorageTick((t) => t + 1);
    alert("Work schedule saved!");
  };

  /* -------------------- PDF PRINT (PER EMPLOYEE) -------------------- */
  const printEmployeePdf = () => {
    if (!selectedEmployee) return alert("Select an employee first.");

    const emp = selectedEmployee;
    const logs = selectedEmployeeAttendanceFiltered;

    const rangeText =
      monthPick ? `Month: ${monthPick}` : filterFrom || filterTo ? `Date Range: ${filterFrom || "—"} to ${filterTo || "—"}` : "All Records";

    const sched = getScheduleHM(emp);
    const schedText = `${pad2(sched.hour)}:${pad2(sched.minute)}`;

    const rows = logs
      .map((r, idx) => {
        const ti = formatPH(r.timeIn);
        const to = r.timeOut ? formatPH(r.timeOut) : "Active";
        const date = dateKeyPH(r.timeIn);
        const status = lateInfo(r.timeIn, emp).statusText;

        const durMs = r.timeOut ? Math.max(0, r.timeOut - r.timeIn) : 0;
        const hm = r.timeOut ? formatHoursMinutes(durMs) : "-";

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${date}</td>
            <td>${status}</td>
            <td>${ti}</td>
            <td>${to}</td>
            <td>${hm}</td>
          </tr>
        `;
      })
      .join("");

    const breakdownRows = selectedEmployeeDailyBreakdown.dates
      .map((d) => {
        const totalMs = selectedEmployeeDailyBreakdown.map.get(d).totalMs;
        return `<tr><td>${d}</td><td>${formatHoursMinutes(totalMs)}</td></tr>`;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>Attendance Report - ${emp.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin: 0 0 6px; }
            .muted { color: #444; margin-bottom: 16px; }
            .box { border: 1px solid #ddd; padding: 14px; border-radius: 10px; margin-bottom: 18px;}
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 10px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
            .row { margin: 4px 0; }
            .summary { margin-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <div class="muted">${rangeText}</div>

          <div class="box">
            <div class="row"><b>Full Name:</b> ${fullNameOf(emp)}</div>
            <div class="row"><b>Employee ID:</b> ${emp.id}</div>
            <div class="row"><b>Start Work Time:</b> ${schedText}</div>
            <div class="row"><b>Age:</b> ${emp.age || "-"}</div>
            <div class="row"><b>Sex:</b> ${emp.sex || "-"}</div>
            <div class="row"><b>Phone:</b> ${emp.phone || "-"}</div>
            <div class="row"><b>Position:</b> ${emp.position || "-"}</div>

            <div class="summary">Total Days Present: ${selectedEmployeeTotals.daysPresent}</div>
            <div class="summary">Total Hours: ${selectedEmployeeTotals.totalHours.toFixed(2)} hrs</div>
          </div>

          <h3>Per Record</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Status</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Total (h m)</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="6">No attendance records.</td></tr>`}
            </tbody>
          </table>

          <h3 style="margin-top:18px;">Total Hours Per Day (Finished only)</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Total Hours</th></tr>
            </thead>
            <tbody>
              ${breakdownRows || `<tr><td colspan="2">No daily totals.</td></tr>`}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) return alert("Popup blocked. Allow popups then try again.");
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  
/* -------------------- EXCEL EXPORT (PER EMPLOYEE) -------------------- */
const exportEmployeeExcel = () => {
  if (!selectedEmployee) return alert("Select an employee first.");

  const emp = selectedEmployee;

  let from = "";
  let to = "";

  if (monthPick) {
    const r = monthRangeFromKey(monthPick);
    if (r) {
      from = r.from;
      to = r.to;
    }
  } else if (filterFrom || filterTo) {
    from = filterFrom || "";
    to = filterTo || "";
  }

  const today = dateKeyPH(Date.now());
  if (!from && !to) {
    from = "2000-01-01";
    to = today;
  } else {
    if (!from) from = "2000-01-01";
    if (!to) to = today;
  }

  const q = new URLSearchParams({ userId: emp.id, from, to }).toString();
  downloadFile(`/api/reports/attendance.xlsx?${q}`, "Exporting Excel...");
};

/* -------------------- EXCEL EXPORT (DAILY FOLDER - ALL EMPLOYEES) -------------------- */
const exportDailyFolderExcel = (date, dayLogs) => {
  if (!dayLogs || dayLogs.length === 0) return;
  const q = new URLSearchParams({ date }).toString();
  downloadFile(`/api/reports/attendance.xlsx?${q}`, "Exporting Excel...");
};

/* -------------------- PDF PRINT (DAILY FOLDER - ALL EMPLOYEES) -------------------- */
  const printDailyFolderPdf = (date, dayLogs) => {
    const safeDate = String(date || "");

    const totalEmployees = dayLogs.length;
    const finishedCount = dayLogs.filter((r) => !!r.timeOut).length;
    const activeCount = totalEmployees - finishedCount;

    const rows = dayLogs
      .map((r, idx) => {
        const emp = usersMap.get("employee_" + r.id) || null;

        const name = emp ? fullNameOf(emp) : "UNKNOWN";
        const sex = emp?.sex || "-";
        const phone = emp?.phone || "-";
        const position = emp?.position || "-";

        const status = lateInfo(r.timeIn, emp).statusText;

        const ti = formatPH(r.timeIn);
        const to = r.timeOut ? formatPH(r.timeOut) : "Active";

        const finished = !!r.timeOut;
        const durMs = finished ? Math.max(0, r.timeOut - r.timeIn) : Math.max(0, now - r.timeIn);
        const totalText = finished
          ? `${formatHoursMinutes(durMs)} (${hoursFromMs(durMs).toFixed(2)} hrs)`
          : `${formatHMS(durMs)} (ACTIVE)`;

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${name}</td>
            <td>${r.id}</td>
            <td>${sex}</td>
            <td>${phone}</td>
            <td>${position}</td>
            <td>${status}</td>
            <td>${ti}</td>
            <td>${to}</td>
            <td>${totalText}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>Daily Attendance - ${safeDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin: 0 0 6px; }
            .muted { color: #444; margin-bottom: 16px; }
            .box { border: 1px solid #ddd; padding: 14px; border-radius: 10px; margin-bottom: 18px;}
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 10px; font-size: 11px; vertical-align: top; }
            th { background: #f3f4f6; text-align: left; }
            .row { margin: 4px 0; }
            .summary { margin-top: 8px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Daily Attendance Report</h1>
          <div class="muted">Date (PH): ${safeDate}</div>

          <div class="box">
            <div class="row"><b>Total Records:</b> ${totalEmployees}</div>
            <div class="row"><b>Finished:</b> ${finishedCount}</div>
            <div class="row"><b>Active:</b> ${activeCount}</div>
            <div class="summary">Generated: ${formatPH(Date.now())}</div>
          </div>

          <h3>All Employees (Time In / Time Out)</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Employee Name</th>
                <th>Employee ID</th>
                <th>Sex</th>
                <th>Phone</th>
                <th>Position</th>
                <th>Status</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="10">No attendance records.</td></tr>`}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) return alert("Popup blocked. Allow popups then try again.");
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  /* -------------------- PHOTO UPLOAD -------------------- */
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Please select an image file.");

    const MAX = 240;
    try {
      const bitmap = await createImageBitmap(file);
      const ratio = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
      const w = Math.max(1, Math.round(bitmap.width * ratio));
      const h = Math.max(1, Math.round(bitmap.height * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(bitmap, 0, 0, w, h);

      const compressed = canvas.toDataURL("image/jpeg", 0.78);
      setEditForm((p) => ({ ...(p || {}), photo: compressed }));
    } catch {
      const reader = new FileReader();
      reader.onload = () => setEditForm((p) => ({ ...(p || {}), photo: String(reader.result || "") }));
      reader.readAsDataURL(file);
    }
  };

  /* -------------------- AUTH -------------------- */
  const signup = async () => {
    setFpError("");
    if (!id.trim()) return alert("ID required");
    if (!/^\d+$/.test(id)) return alert("ID must contain numbers only.");
    if (!form.firstName.trim() || !form.lastName.trim() || !String(form.age).trim() || !form.sex.trim() || !form.phone.trim()) {
      return alert("Please fill First Name, Last Name, Age, Sex, and Phone Number.");
    }
    if (form.phone.length !== 11) return alert("Phone number must be exactly 11 digits.");
    if (role === "employee" && !form.position.trim()) return alert("Position is required for employee.");

    // Require all 3 fingerprint scans
    if (!fpScans || fpScans.length < 3) {
      return alert("Please complete ALL 3 fingerprint scans before creating an account.");
    }

    const defaultPassword = id.trim() + "123"; // auto-password: ID + "123"

    setFpLoading(true);
    try {
      const body = {
        id: id.trim(),
        role,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
        age: Number(form.age),
        sex: form.sex,
        phone: form.phone,
        position: form.position.trim() || null,
        photo: form.photo || null,
        username: id.trim(),
        password: defaultPassword,
        scans: fpScans.map(s => ({ templateData: s.template, templateImage: s.image ?? "", quality: s.quality ?? 75 })),
        source: fpSource ?? "zkteco",
        finger: 0,
      };

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.error || "Sign up failed");
        return;
      }

      // Also cache locally so usersMap works offline
      const userData = { id: id.trim(), role: data.role || role, ...form, scheduleTime: role === "employee" ? "08:00" : "" };
      localStorage.setItem(role + "_" + id.trim(), JSON.stringify(userData));

      setUser(userData);
      setPage(role === "admin" ? "admin" : "login");
      setView("attendance");
      setMenuOpen(false);
      setFpTemplate(null); setFpScans([]); setFpSource(null);

      setAdminTab("folders");
      setSelectedEmpId("");
      setEmpSearch("");
      setFilterFrom("");
      setFilterTo("");
      setMonthPick("");
      setFolderDatePick("");
      setExpandedDates(new Set());

      alert(`Account created! Your password is: ${defaultPassword}\nSave this – you can log in with password next time.`);
    } finally {
      setFpLoading(false);
    }
  };

  const login = async () => {
    setFpError("");
    if (!id.trim()) return alert("ID required");
    if (!/^\d+$/.test(id)) return alert("ID must contain numbers only.");

    if (!fpTemplate) {
      return alert("Please scan your fingerprint first.");
    }

    setFpLoading(true);
    try {
      const res = await fetch("/api/auth/login-fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateData: fpTemplate, source: fpSource ?? "zkteco", userId: id.trim(), role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFpError(data?.error || "Fingerprint not recognised. Try again.");
        setFpTemplate(null);
        setFpSource(null);
        return;
      }

      // Try local cache first; fall back to API user record
      let userData = null;
      const cached = localStorage.getItem(role + "_" + id.trim());
      if (cached) {
        try { userData = JSON.parse(cached); } catch {}
      }
      if (!userData) {
        // fetch from DB
        const uRes = await fetch("/api/bootstrap");
        const uData = await uRes.json().catch(() => null);
        userData = (uData?.users || []).find((u) => u.id === id.trim()) || null;
        if (userData) {
          localStorage.setItem(role + "_" + id.trim(), JSON.stringify(userData));
        }
      }
      if (!userData) {
        // Build a minimal user object from the session role
        userData = { id: id.trim(), role: data.role || role, firstName: "User", lastName: id.trim(), scheduleTime: "08:00" };
      }

      // Enforce role: the account's actual role must match what was selected
      if (data.role !== role) {
        setFpError(`This is a ${data.role} account. Please select "${data.role}" as the role.`);
        setFpTemplate(null); setFpSource(null);
        return;
      }

      setUser(userData);
      if (data.role === "employee") {
        // Stay on login page but show Time In / Break / Time Out quick panel
        setShowQuickAction(true);
      } else {
        setPage("admin");
        setView("attendance");
        setMenuOpen(false);
        setAdminTab("folders");
        setSelectedEmpId("");
        setEmpSearch("");
        setFilterFrom("");
        setFilterTo("");
        setMonthPick("");
        setFolderDatePick("");
        setExpandedDates(new Set());
      }
      setFpTemplate(null); setFpScans([]); setFpSource(null);
    } finally {
      setFpLoading(false);
    }
  };

  const logout = () => {
    // Clear session on the server
    fetch("/api/auth/logout", { method: "POST" }).catch((e) => console.error("Logout error", e));

    setMenuOpen(false);
    setUser(null);
    setId("");
    setRole("employee");
    setPage("login");
    setView("attendance");
    setEditForm(null);
    setShowQuickAction(false);

    setAdminTab("folders");
    setSelectedEmpId("");
    setEmpSearch("");
    setFilterFrom("");
    setFilterTo("");
    setMonthPick("");
    setFolderDatePick("");
    setExpandedDates(new Set());
  };

  const openProfile = () => {
    if (!currentUser) return;
    setEditForm({
      firstName: currentUser.firstName || "",
      middleName: currentUser.middleName || "",
      lastName: currentUser.lastName || "",
      age: currentUser.age || "",
      position: currentUser.position || "",
      sex: currentUser.sex || "",
      phone: currentUser.phone || "",
      photo: currentUser.photo || "",
      scheduleTime: currentUser.scheduleTime || "08:00",
    });
    setView("profile");
  };

  const saveProfile = () => {
    if (!editForm || !currentUser) return;

    if (!String(editForm.age).trim() || !editForm.sex.trim() || !editForm.phone.trim()) {
      return alert("Age, Sex and Phone are required.");
    }
    if (editForm.phone.length !== 11) return alert("Phone number must be exactly 11 digits.");
    if (currentUser.role === "employee" && !editForm.position.trim()) return alert("Position is required for employee.");

    // Employees cannot change name or photo — keep original values
    const protectedFields = currentUser.role === "employee"
      ? { firstName: currentUser.firstName, middleName: currentUser.middleName, lastName: currentUser.lastName, photo: currentUser.photo }
      : {};

    // Admins must have first+last name
    if (currentUser.role === "admin" && (!editForm.firstName.trim() || !editForm.lastName.trim())) {
      return alert("First Name and Last Name are required.");
    }

    const updated = { ...currentUser, ...editForm, ...protectedFields, scheduleTime: currentUser.scheduleTime || editForm.scheduleTime || "08:00" };
    setUser(updated);
    localStorage.setItem(updated.role + "_" + updated.id, JSON.stringify(updated));
    setStorageTick((t) => t + 1);
    alert("Profile saved!");
  };

  /* -------------------- ATTENDANCE -------------------- */
  const timeIn = () => {
    if (!currentUser || currentUser.role !== "employee") return;
    const ok = window.confirm("Are you sure that you time in?");
    if (!ok) return;

    const mine = records
      .filter((r) => r.role === "employee" && String(r.id) === String(currentUser.id))
      .sort((a, b) => b.timeIn - a.timeIn);

    if (mine[0] && !mine[0].timeOut) return alert("You already have an active Time In.");

    setRecords([...records, { id: currentUser.id, role: currentUser.role, timeIn: Date.now(), timeOut: null }]);
  };

  const timeOut = () => {
    if (!currentUser || currentUser.role !== "employee") return;
    const ok = window.confirm("Are you sure that you time out?");
    if (!ok) return;

    const nowTime = Date.now();

    let updatedOne = false;
    const updated = [...records]
      .reverse()
      .map((r) => {
        if (!updatedOne && String(r.id) === String(currentUser.id) && r.role === currentUser.role && !r.timeOut) {
          updatedOne = true;
          return { ...r, timeOut: nowTime };
        }
        return r;
      })
      .reverse();

    if (!updatedOne) return alert("No active Time In found.");

    // Auto break out if there is an active break
    if (myActiveBreak) {
      setBreaks(
        breaks.map((b) =>
          String(b.id) === String(currentUser.id) && b.role === currentUser.role && !b.breakEnd
            ? { ...b, breakEnd: nowTime }
            : b
        )
      );
    }

    setRecords(updated);
  };

  const startBreak = () => {
    if (!currentUser || currentUser.role !== "employee") return;
    if (!myActiveSession) return alert("You must be timed in to start a break.");
    if (myActiveBreak) return alert("You already have an active break.");
    const ok = window.confirm("Start break?");
    if (!ok) return;
    setBreaks([...breaks, { id: currentUser.id, role: currentUser.role, breakStart: Date.now(), breakEnd: null }]);
  };

  const endBreak = () => {
    if (!currentUser || currentUser.role !== "employee") return;
    if (!myActiveBreak) return alert("No active break found.");
    const ok = window.confirm("End break?");
    if (!ok) return;
    setBreaks(
      breaks.map((b) =>
        String(b.id) === String(currentUser.id) && b.role === currentUser.role && !b.breakEnd
          ? { ...b, breakEnd: Date.now() }
          : b
      )
    );
  };

  /* -------------------- LOGIN UI -------------------- */
  if (initializing) {
    return (
      <div className="authShell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ width: 44, height: 44, border: "3px solid rgba(56, 189, 248, 0.15)", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "appInitSpin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>Loading Barangay System...</div>
        </div>
        <style>{`
          @keyframes appInitSpin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (page === "login")
    return (
      <div className="authShell">
        <div className="authGrid">

          {/* ── LEFT: Logo panel / Employee card ── */}
          <div className="authVisual">
            {/* When employee is logged in, show their profile card here */}
            {currentUser && currentUser.role === "employee" ? (
              <div className="employee-card-wrap">
                {/* Date and Time - upper left */}
                
                {/* Profile hero */}
                <div className="employee-hero">
                  {currentUser.photo ? (
                    <img src={currentUser.photo} alt="Profile" className="employee-avatar-img" />
                  ) : (
                    <div className="employee-avatar-fallback">
                      {(currentUser.firstName?.[0] || "E").toUpperCase()}
                    </div>
                  )}
                  <div className="employee-meta">
                    <div className="employee-name">
                      {fullNameOf(currentUser)}
                    </div>
                    <div className="employee-sub">
                      <span>EMPLOYEE • ID: <b style={{ color: "#38bdf8" }}>{currentUser.id}</b></span>
                      {currentUser.position && <span>{currentUser.position.toUpperCase()}</span>}
                    </div>
                    {myActiveSession ? (
                      <div className="status-tag-active">
                        <div className="status-dot-active" />
                        <span style={{ fontSize: 13, color: "#34d399", fontWeight: 700 }}>ACTIVE</span>
                      </div>
                    ) : (
                      <div className="status-tag-offline">
                        <div className="status-dot-offline" />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", fontWeight: 600 }}>OFFLINE</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attendance actions */}
                <div className="attendance-actions-grid">
                  <button onClick={timeIn} className="btn btn-time-in">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Time In
                  </button>
                  <button onClick={timeOut} className="btn btn-time-out">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    Time Out
                  </button>
                  {myActiveBreak ? (
                    <button onClick={endBreak} className="btn btn-break">
                      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      Break Out
                    </button>
                  ) : (
                    <button onClick={startBreak} className="btn btn-break">
                      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/></svg>
                      Break In
                    </button>
                  )}
                </div>

                {/* Scrollable logs wrapper */}
                <div style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                  {/* Today's attendance log */}
                  <div className="attendance-log-section">
                    <div className="attendance-log-title">
                      Today&apos;s Attendance — {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    {myRecords.filter(r => dateKeyPH(r.timeIn) === dateKeyPH(Date.now())).length === 0 ? (
                      <div className="attendance-log-empty">No records today yet</div>
                    ) : (
                      <div className="attendance-log-list" style={{ maxHeight: "none", overflowY: "visible" }}>
                        {myRecords.filter(r => dateKeyPH(r.timeIn) === dateKeyPH(Date.now())).map((r, i) => {
                          const recBreaks = breaks.filter(b => String(b.id) === String(currentUser.id) && b.role === currentUser.role && b.breakStart >= r.timeIn && (!r.timeOut || b.breakStart <= r.timeOut));
                          return (
                            <div key={i} className="attendance-log-item">
                              {/* Time In / Time Out row */}
                              <div className="log-item-row-2col">
                                <div className={`time-in-block ${!r.timeOut ? "active" : ""}`}>
                                  <div className="log-block-label">Time In</div>
                                  <div className="log-block-val in-color">{formatTimePH(r.timeIn)}</div>
                                  {!r.timeOut && (
                                    <div className="log-block-duration">
                                      {formatHMS(now - r.timeIn)}
                                    </div>
                                  )}
                                </div>
                                <div className={`time-out-block ${r.timeOut ? "active" : ""}`}>
                                  <div className="log-block-label">Time Out</div>
                                  <div className={`log-block-val ${r.timeOut ? "out-color" : "muted-color"}`}>{r.timeOut ? formatTimePH(r.timeOut) : "—"}</div>
                                  {r.timeOut && (
                                    <div className="log-block-duration muted">
                                      {formatHMS(r.timeOut - r.timeIn)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Break In / Break Out row */}
                              <div className="log-item-row-breaks">
                                {recBreaks.length > 0 ? recBreaks.map((b, bi) => {
                                  return (
                                    <React.Fragment key={bi}>
                                      <div className={`break-in-block ${!b.breakEnd ? "active" : ""}`}>
                                        <div className="log-block-label">Break In</div>
                                        <div className="log-block-val break-color">{formatTimePH(b.breakStart)}</div>
                                        {!b.breakEnd && (
                                          <div className="log-block-duration">
                                            {formatHMS(now - b.breakStart)}
                                          </div>
                                        )}
                                      </div>
                                      <div className={`break-out-block ${b.breakEnd ? "active" : ""}`}>
                                        <div className="log-block-label">Break Out</div>
                                        <div className={`log-block-val ${b.breakEnd ? "in-color" : "muted-color"}`}>{b.breakEnd ? formatTimePH(b.breakEnd) : "—"}</div>
                                        {b.breakEnd && (
                                          <div className="log-block-duration muted">
                                            {formatHMS(b.breakEnd - b.breakStart)}
                                          </div>
                                        )}
                                      </div>
                                    </React.Fragment>
                                  );
                                }) : (
                                  <div className="log-block-no-breaks">No breaks</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Attendance History (Old Attendance) */}
                  <div className="attendance-log-section" style={{ marginTop: 20 }}>
                    <div className="attendance-log-title">
                      Attendance History (Old Attendance)
                    </div>
                    {myRecords.filter(r => dateKeyPH(r.timeIn) !== dateKeyPH(Date.now())).length === 0 ? (
                      <div className="attendance-log-empty">No past records found</div>
                    ) : (
                      <div className="attendance-log-list" style={{ maxHeight: "none", overflowY: "visible" }}>
                        {myRecords.filter(r => dateKeyPH(r.timeIn) !== dateKeyPH(Date.now())).map((r, i) => {
                          const recBreaks = breaks.filter(b => String(b.id) === String(currentUser.id) && b.role === currentUser.role && b.breakStart >= r.timeIn && (!r.timeOut || b.breakStart <= r.timeOut));
                          return (
                            <div key={i} className="attendance-log-item" style={{ opacity: 0.85, padding: "10px", marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4, fontWeight: 700 }}>
                                {new Date(r.timeIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                              {/* Time In / Time Out row */}
                              <div className="log-item-row-2col">
                                <div className="time-in-block">
                                  <div className="log-block-label">Time In</div>
                                  <div className="log-block-val in-color">{formatTimePH(r.timeIn)}</div>
                                </div>
                                <div className={`time-out-block ${r.timeOut ? "active" : ""}`}>
                                  <div className="log-block-label">Time Out</div>
                                  <div className={`log-block-val ${r.timeOut ? "out-color" : "muted-color"}`}>{r.timeOut ? formatTimePH(r.timeOut) : "—"}</div>
                                  {r.timeOut && (
                                    <div className="log-block-duration muted">
                                      {formatHMS(r.timeOut - r.timeIn)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Break In / Break Out row */}
                              <div className="log-item-row-breaks">
                                {recBreaks.length > 0 ? recBreaks.map((b, bi) => {
                                  return (
                                    <React.Fragment key={bi}>
                                      <div className="break-in-block">
                                        <div className="log-block-label">Break In</div>
                                        <div className="log-block-val break-color">{formatTimePH(b.breakStart)}</div>
                                      </div>
                                      <div className={`break-out-block ${b.breakEnd ? "active" : ""}`}>
                                        <div className="log-block-label">Break Out</div>
                                        <div className={`log-block-val ${b.breakEnd ? "in-color" : "muted-color"}`}>{b.breakEnd ? formatTimePH(b.breakEnd) : "—"}</div>
                                        {b.breakEnd && (
                                          <div className="log-block-duration muted">
                                            {formatHMS(b.breakEnd - b.breakStart)}
                                          </div>
                                        )}
                                      </div>
                                    </React.Fragment>
                                  );
                                }) : (
                                  <div className="log-block-no-breaks">No breaks</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Back to Scanner button at the bottom center */}
                <div className="back-btn-row">
                  <button onClick={logout} className="btn-back-scanner">
                    Back to Scanner
                  </button>
                </div>
              </div>
            ) : (
              /* Default: branding + logo */
              <>
                <div className="authBrand">
                  <div className="kicker">BARANGAY ATTENDANCE SYSTEM</div>
                  <div className="name">Barangay E. Rodriguez</div>
                  <div className="desc">Secure Sign In • Fingerprint Authentication</div>
                </div>
            <div className="barangayLogoWrap">
              <img src={BARANGAY_LOGO_BASE64} alt="Barangay E. Rodriguez Sr. Logo" className="barangayLogo" />
            </div>
            <div style={{ marginTop: 18, fontSize: 12, letterSpacing: "0.12em", color: "rgba(255,255,255,0.38)", textAlign: "center" }}>
              DIST. 3 - QUEZON CITY
            </div>
              </>
            )}
          </div>

          {/* ── RIGHT: Login card — always visible with scanner + create buttons ── */}
          <div className="authCard">
            {currentUser && currentUser.role === "employee" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 20 }}>
                <div className="authBrand" style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px", position: "relative", zIndex: 2, alignItems: "center", textAlign: "center" }}>
                  <div className="kicker" style={{ fontSize: 11, letterSpacing: ".28em", color: "var(--sec-muted)", textTransform: "uppercase" }}>BARANGAY ATTENDANCE SYSTEM</div>
                  <div className="name" style={{ fontSize: 22, fontWeight: 850, letterSpacing: ".3px" }}>Barangay E. Rodriguez</div>
                  <div className="desc" style={{ fontSize: 12, color: "var(--sec-muted)" }}>Secure Sign In • Fingerprint Authentication</div>
                </div>
                <div className="barangayLogoWrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "8px 0" }}>
                  <img src={BARANGAY_LOGO_BASE64} alt="Barangay E. Rodriguez Sr. Logo" className="barangayLogo" style={{ width: 130 }} />
                </div>
                <div style={{ marginTop: 14, fontSize: 11, letterSpacing: "0.12em", color: "rgba(255,255,255,0.38)", textAlign: "center" }}>
                  DIST. 3 - QUEZON CITY
                </div>
                <hr style={{ width: "100%", borderColor: "rgba(255,255,255,0.08)", margin: "20px 0" }} />
              </div>
            )}


            {/* Fingerprint scanner — always-on, auto-connect, no button */}
            <div style={{ marginTop: 8 }}>
              <FingerprintScanner
                autoStart={true}
                mode="single"
                onCapture={async (tpl, src) => {
                  if (fpLoading) return;
                  setFpLoading(true);
                  setFpError("");
                  try {
                    const res = await fetch("/api/auth/login-fingerprint", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ templateData: tpl }),
                    });
                    const data = await res.json().catch(() => null);
                    if (!res.ok) {
                      setFpError(data?.error || "Fingerprint not recognised. Try again.");
                      return;
                    }
                    const detectedRole = data.role || "employee";
                    let userData = data.user || null;
                    if (!userData) {
                      const cached = localStorage.getItem(detectedRole + "_" + data.userId);
                      if (cached) { try { userData = JSON.parse(cached); } catch {} }
                    }
                    if (!userData) {
                      const uRes = await fetch("/api/bootstrap");
                      const uData = await uRes.json().catch(() => null);
                      userData = (uData?.users || []).find((u) => u.id === data.userId) || null;
                    }
                    if (!userData) {
                      userData = { id: data.userId, role: detectedRole, firstName: data.firstName || "User", lastName: data.lastName || data.userId, scheduleTime: data.scheduleTime || "08:00" };
                    }
                    localStorage.setItem(detectedRole + "_" + userData.id, JSON.stringify(userData));
                    setUser(userData);
                    setFpTemplate(tpl);
                    if (detectedRole === "admin") {
                      setPage("admin");
                      setView("attendance"); setMenuOpen(false);
                      setAdminTab("folders"); setSelectedEmpId(""); setEmpSearch("");
                      setFilterFrom(""); setFilterTo(""); setMonthPick(""); setFolderDatePick(""); setExpandedDates(new Set());
                    } else if (detectedRole === "employee") {
                      setShowQuickAction(true);
                    }
                  } finally { setFpLoading(false); }
                }}
              />
              {fpError && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{fpError}</p>}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn ghost" style={{ flex: 1, fontSize: 12 }} onClick={() => { setRole("employee"); setPage("signup"); }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  Create Employee
                </span>
              </button>
              <button className="btn ghost" style={{ flex: 1, fontSize: 12 }} onClick={() => { setRole("admin"); setPage("signup"); }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  Create Admin
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );


  /* -------------------- SIGNUP UI -------------------- */
  if (page === "signup")
    return (
      <div className="authShell">
        <div className="authGrid">
          <div className="authVisual">
            <div className="authBrand">
              <div className="kicker">BARANGAY ATTENDANCE SYSTEM</div>
              <div className="name">Barangay E. Rodriguez</div>
              <div className="desc">Secure Sign Up • Fingerprint Registration</div>
            </div>
            <div className="barangayLogoWrap">
              <img src={BARANGAY_LOGO_BASE64} alt="Barangay E. Rodriguez Sr. Logo" className="barangayLogo" />
            </div>
          </div>

          <div className="authCard">
            <div className="authHeader">
              <div className="bigTitle">Barangay E. Rodriguez • {role === "employee" ? "Employee" : "Admin"} Sign Up</div>
              <div className="muted">Please fill in your details and register your fingerprint</div>
            </div>

            <div className="grid2">
              <div className="field">
                <div className="label">ID (numbers only)</div>
                <TextInput value={id} inputMode="numeric" pattern="[0-9]*" placeholder="Enter numeric ID" onChange={(e) => setId(numbersOnly(e.target.value))} />
              </div>

              <div className="field">
                <div className="label">First Name</div>
                <TextInput value={form.firstName} placeholder="First Name" onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>

              <div className="field">
                <div className="label">Middle Name</div>
                <TextInput value={form.middleName} placeholder="Middle Name" onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
              </div>

              <div className="field">
                <div className="label">Last Name</div>
                <TextInput value={form.lastName} placeholder="Last Name" onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>

              <div className="field">
                <div className="label">Age</div>
                <TextInput value={String(form.age ?? "")} inputMode="numeric" pattern="[0-9]*" placeholder="Age" onChange={(e) => setForm({ ...form, age: numbersOnly(e.target.value) })} />
              </div>

              <div className="field">
                <div className="label">Sex</div>
                <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="field">
                <div className="label">Phone Number (11 digits)</div>
                <TextInput value={form.phone} inputMode="numeric" pattern="[0-9]*" placeholder="09XXXXXXXXX" onChange={(e) => setForm({ ...form, phone: numbersOnly(e.target.value).slice(0, 11) })} />
              </div>

              {role === "employee" && (
                <div className="field">
                  <div className="label">Position</div>
                  <TextInput value={form.position} placeholder="Position" onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </div>
              )}
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <div className="label">Profile Picture <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.40)" }}>(optional)</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                  {form.photo ? (
                    <img src={form.photo} alt="Preview" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(56,189,248,0.40)", boxShadow: "0 0 16px rgba(56,189,248,0.20)" }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(56,189,248,0.08)", border: "2px dashed rgba(56,189,248,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(56,189,248,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ cursor: "pointer" }}>
                      <div className="btn ghost" style={{ fontSize: 12, padding: "7px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        Upload Photo
                      </div>
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const MAX = 240;
                        try {
                          const bitmap = await createImageBitmap(file);
                          const ratio = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
                          const w = Math.max(1, Math.round(bitmap.width * ratio));
                          const h = Math.max(1, Math.round(bitmap.height * ratio));
                          const canvas = document.createElement("canvas");
                          canvas.width = w; canvas.height = h;
                          const ctx = canvas.getContext("2d");
                          ctx.drawImage(bitmap, 0, 0, w, h);
                          setForm({ ...form, photo: canvas.toDataURL("image/jpeg", 0.78) });
                        } catch {
                          const reader = new FileReader();
                          reader.onload = () => setForm({ ...form, photo: String(reader.result || "") });
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                    {form.photo && (
                      <button type="button" className="btn ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setForm({ ...form, photo: "" })}>Remove</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Fingerprint enrollment during signup (2 scans required) ── */}
            <div style={{ border: "1px solid rgba(56,189,248,0.25)", borderRadius: 14, padding: "14px 16px", background: "rgba(11,16,32,0.60)", backdropFilter: "blur(12px)", marginTop: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.90)", marginBottom: 4 }}>
                Fingerprint Registration <span style={{ color: "#ff5a7a" }}>*</span>
                <span style={{ fontWeight: 400, fontSize: 11, color: "rgba(255,255,255,0.50)", marginLeft: 6 }}>(3 scans required — same finger)</span>
              </div>

              {/* Scanner — shows until all 3 done */}
              {fpScans.length < 3 && (
                <FingerprintScanner
                  mode="enroll"
                  onCapture={(tpl, src, scans) => {
                    if (scans && scans.length >= 3) {
                      setFpScans(scans);
                      setFpSource(src);
                      setFpError("");
                    }
                  }}
                />
              )}

              {/* All 3 done — show success with scan images */}
              {fpScans.length >= 3 && (
                <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ color: "#34d399", fontWeight: 700, fontSize: 13 }}>3/3 fingerprint scans saved</span>
                    <button type="button"
                      onClick={() => { setFpScans([]); setFpSource(null); }}
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
                        color: "rgba(255,255,255,0.60)", cursor: "pointer", borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                      Re-scan
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    {fpScans.map((sc, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.18)",
                        borderRadius: 10, padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, color: i === 0 ? "#38bdf8" : "#34d399", fontWeight: 700 }}>
                          {i === 0 ? "Scan 1 — Reference" : `Scan ${i + 1}`}
                        </div>
                        {sc.image
                          ? <img src={`data:image/bmp;base64,${sc.image}`} alt={`scan${i+1}`}
                              style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 7,
                                border: "1.5px solid rgba(56,189,248,0.30)", background: "#050a14",
                                filter: "contrast(1.15) brightness(1.08)",
                                boxShadow: "0 4px 12px rgba(56,189,248,0.15)" }} />
                          : <div style={{ width: 80, height: 100, display: "flex", alignItems: "center", justifyContent: "center",
                              background: "rgba(56,189,248,0.04)", borderRadius: 7,
                              border: "1.5px dashed rgba(56,189,248,0.22)", color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                              No image
                            </div>
                        }
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Quality: {sc.quality}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


            </div>

            <button className="btn primary" onClick={signup} disabled={fpLoading || fpScans.length < 3}
              style={{ opacity: (fpScans.length < 3 || fpLoading) ? 0.45 : 1, cursor: (fpScans.length < 3 || fpLoading) ? "not-allowed" : "pointer" }}>
              {fpLoading ? "Creating Account…" : "Create Account"}
            </button>
            <button className="btn ghost" onClick={() => setPage("login")}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  /* -------------------- EMPLOYEE PAGE -------------------- */
  if (page === "employee")
    return (
      <Shell>
        <div className="dash">
          <TopBar user={currentUser} menuOpen={menuOpen} setMenuOpen={setMenuOpen} openProfile={openProfile} logout={logout} fullNameOf={fullNameOf} />
          
          <div className="contentCard mt12" style={{ maxWidth: 560, margin: "0 auto" }}>
            {view === "profile" && editForm ? (
              <ProfileView editForm={editForm} setEditForm={setEditForm} user={currentUser} saveProfile={saveProfile} setView={setView} handlePhotoUpload={handlePhotoUpload} />
            ) : (
              <div style={{ width: "100%", padding: "0 16px" }}>
                {/* Date and Time - upper left */}
                
                {/* Profile hero */}
                <div className="employee-hero">
                  {currentUser.photo ? (
                    <img src={currentUser.photo} alt="Profile" style={{
                      width: 100, height: 100, borderRadius: "26px", objectFit: "cover",
                      border: "3px solid rgba(56,189,248,0.50)",
                      boxShadow: "0 0 24px rgba(56,189,248,0.30)", flexShrink: 0,
                    }} />
                  ) : (
                    <div style={{
                      width: 100, height: 100, borderRadius: "26px", flexShrink: 0,
                      background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 38, fontWeight: 800, color: "#fff",
                      border: "3px solid rgba(56,189,248,0.50)",
                      boxShadow: "0 0 24px rgba(56,189,248,0.30)",
                    }}>
                      {(currentUser.firstName?.[0] || "E").toUpperCase()}
                    </div>
                  )}
                  <div className="employee-meta">
                    <div className="employee-name">
                      {fullNameOf(currentUser)}
                    </div>
                    <div className="employee-sub">
                      <span>EMPLOYEE • ID: <b style={{ color: "#38bdf8" }}>{currentUser.id}</b></span>
                      {currentUser.position && <span>{currentUser.position.toUpperCase()}</span>}
                    </div>
                    {myActiveSession ? (
                      <div className="status-tag-active">
                        <div className="status-dot-active" />
                        <span style={{ fontSize: 13, color: "#34d399", fontWeight: 700 }}>ACTIVE</span>
                      </div>
                    ) : (
                      <div className="status-tag-offline">
                        <div className="status-dot-offline" />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", fontWeight: 600 }}>OFFLINE</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attendance actions */}
                <div className="attendance-actions-grid">
                  <button onClick={timeIn} className="btn btn-time-in">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Time In
                  </button>
                  <button onClick={timeOut} className="btn btn-time-out">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    Time Out
                  </button>
                  {myActiveBreak ? (
                    <button onClick={endBreak} className="btn" style={{ gridColumn: "span 2", padding: "14px 0", borderRadius: 14, border: "2px solid rgba(251, 191, 36, 0.20)", cursor: "pointer", background: "transparent", color: "#fbbf24", fontWeight: 700, fontSize: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      Break Out
                    </button>
                  ) : (
                    <button onClick={startBreak} className="btn" style={{ gridColumn: "span 2", padding: "14px 0", borderRadius: 14, border: "2px solid rgba(251, 191, 36, 0.20)", cursor: "pointer", background: "transparent", color: "#fbbf24", fontWeight: 700, fontSize: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/></svg>
                      Break In
                    </button>
                  )}
                </div>

                {/* Scrollable logs wrapper */}
                <div style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                  {/* Today's attendance log */}
                  <div className="attendance-log-section">
                    <div className="attendance-log-title">
                      Today's Attendance — {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    {myRecords.filter(r => dateKeyPH(r.timeIn) === dateKeyPH(Date.now())).length === 0 ? (
                      <div className="attendance-log-empty">No records today yet</div>
                    ) : (
                      <div className="attendance-log-list" style={{ maxHeight: "none", overflowY: "visible" }}>
                        {myRecords.filter(r => dateKeyPH(r.timeIn) === dateKeyPH(Date.now())).map((r, i) => {
                          const recBreaks = breaks.filter(b => String(b.id) === String(currentUser.id) && b.role === currentUser.role && b.breakStart >= r.timeIn && (!r.timeOut || b.breakStart <= r.timeOut));
                          return (
                            <div key={i} className="attendance-log-item">
                              {/* Time In / Time Out row */}
                              <div className="log-item-row-2col">
                                <div className={`time-in-block ${!r.timeOut ? "active" : ""}`}>
                                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", fontWeight: 700, marginBottom: 3, textTransform: "uppercase" }}>Time In</div>
                                  <div className="log-block-val in-color">{formatTimePH(r.timeIn)}</div>
                                  {!r.timeOut && (
                                    <div className="log-block-duration">
                                      {formatHMS(now - r.timeIn)}
                                    </div>
                                  )}
                                </div>
                                <div className={`time-out-block ${r.timeOut ? "active" : ""}`}>
                                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", fontWeight: 700, marginBottom: 3, textTransform: "uppercase" }}>Time Out</div>
                                  <div className={`log-block-val ${r.timeOut ? "out-color" : "muted-color"}`}>{r.timeOut ? formatTimePH(r.timeOut) : "—"}</div>
                                  {r.timeOut && (
                                    <div className="log-block-duration muted">
                                      {formatHMS(r.timeOut - r.timeIn)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Break In / Break Out row */}
                              <div className="log-item-row-breaks">
                                {recBreaks.length > 0 ? recBreaks.map((b, bi) => {
                                  return (
                                    <React.Fragment key={bi}>
                                      <div className={`break-in-block ${!b.breakEnd ? "active" : ""}`}>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>Break In</div>
                                        <div className="log-block-val break-color">{formatTimePH(b.breakStart)}</div>
                                        {!b.breakEnd && (
                                          <div className="log-block-duration">
                                            {formatHMS(now - b.breakStart)}
                                          </div>
                                        )}
                                      </div>
                                      <div className={`break-out-block ${b.breakEnd ? "active" : ""}`}>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>Break Out</div>
                                        <div className={`log-block-val ${b.breakEnd ? "in-color" : "muted-color"}`}>{b.breakEnd ? formatTimePH(b.breakEnd) : "—"}</div>
                                        {b.breakEnd && (
                                          <div className="log-block-duration muted">
                                            {formatHMS(b.breakEnd - b.breakStart)}
                                          </div>
                                        )}
                                      </div>
                                    </React.Fragment>
                                  );
                                }) : (
                                  <div className="log-block-no-breaks">No breaks</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Attendance History (Old Attendance) */}
                  <div className="attendance-log-section" style={{ marginTop: 20 }}>
                    <div className="attendance-log-title">
                      Attendance History (Old Attendance)
                    </div>
                    {myRecords.filter(r => dateKeyPH(r.timeIn) !== dateKeyPH(Date.now())).length === 0 ? (
                      <div className="attendance-log-empty">No past records found</div>
                    ) : (
                      <div className="attendance-log-list" style={{ maxHeight: "none", overflowY: "visible" }}>
                        {myRecords.filter(r => dateKeyPH(r.timeIn) !== dateKeyPH(Date.now())).map((r, i) => {
                          const recBreaks = breaks.filter(b => String(b.id) === String(currentUser.id) && b.role === currentUser.role && b.breakStart >= r.timeIn && (!r.timeOut || b.breakStart <= r.timeOut));
                          return (
                            <div key={i} className="attendance-log-item" style={{ opacity: 0.85, padding: "10px", marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4, fontWeight: 700 }}>
                                {new Date(r.timeIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                              {/* Time In / Time Out row */}
                              <div className="log-item-row-2col">
                                <div className="time-in-block">
                                  <div className="log-block-label">Time In</div>
                                  <div className="log-block-val in-color">{formatTimePH(r.timeIn)}</div>
                                </div>
                                <div className={`time-out-block ${r.timeOut ? "active" : ""}`}>
                                  <div className="log-block-label">Time Out</div>
                                  <div className={`log-block-val ${r.timeOut ? "out-color" : "muted-color"}`}>{r.timeOut ? formatTimePH(r.timeOut) : "—"}</div>
                                  {r.timeOut && (
                                    <div className="log-block-duration muted">
                                      {formatHMS(r.timeOut - r.timeIn)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Break In / Break Out row */}
                              <div className="log-item-row-breaks">
                                {recBreaks.length > 0 ? recBreaks.map((b, bi) => {
                                  return (
                                    <React.Fragment key={bi}>
                                      <div className="break-in-block">
                                        <div className="log-block-label">Break In</div>
                                        <div className="log-block-val break-color">{formatTimePH(b.breakStart)}</div>
                                      </div>
                                      <div className={`break-out-block ${b.breakEnd ? "active" : ""}`}>
                                        <div className="log-block-label">Break Out</div>
                                        <div className={`log-block-val ${b.breakEnd ? "in-color" : "muted-color"}`}>{b.breakEnd ? formatTimePH(b.breakEnd) : "—"}</div>
                                        {b.breakEnd && (
                                          <div className="log-block-duration muted">
                                            {formatHMS(b.breakEnd - b.breakStart)}
                                          </div>
                                        )}
                                      </div>
                                    </React.Fragment>
                                  );
                                }) : (
                                  <div className="log-block-no-breaks">No breaks</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Back to Scanner button at the bottom center */}
                <div className="back-btn-row">
                  <button onClick={logout} className="btn-back-scanner">
                    Back to Scanner
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Shell>
    );

  /* -------------------- ADMIN PAGE -------------------- */
  if (page === "admin")
    return (
      <Shell>
        <div className="dash">
          <TopBar user={currentUser} menuOpen={menuOpen} setMenuOpen={setMenuOpen} openProfile={openProfile} logout={logout} fullNameOf={fullNameOf} />


{isExporting && (
  <div className="exportOverlay">
    <div className="exportCard">
      <div className="spinner" />
      <div>{exportMsg || "Exporting..."}</div>
    </div>
  </div>
)}

          <div className="contentCard mt12">
            {view === "profile" && editForm ? (
              <ProfileView editForm={editForm} setEditForm={setEditForm} user={currentUser} saveProfile={saveProfile} setView={setView} handlePhotoUpload={handlePhotoUpload} />
            ) : (
              <>
                {/*NAV BUTTONS. If small screen, it scrolls horizontally. */}
                <div className="adminNavRow">
                  <button className={`btn ghost ${adminTab === "folders" ? "activeTab" : ""}`} onClick={() => { setAdminTab("folders"); setSelectedEmpId(""); }}>
                    Attendance Records
                  </button>
                  <button className={`btn ghost ${adminTab === "employees" ? "activeTab" : ""}`} onClick={() => { setAdminTab("employees"); setSelectedEmpId(""); }}>
                    Employee Accounts
                  </button>
                  <button className={`btn ghost ${adminTab === "admins" ? "activeTab" : ""}`} onClick={() => { setAdminTab("admins"); setSelectedEmpId(""); }}>
                    Admin Accounts
                  </button>
                  <button className={`btn ghost ${adminTab === "trash" ? "activeTab" : ""}`} onClick={() => { setAdminTab("trash"); setSelectedEmpId(""); }}>
                    Trash
                  </button>
                </div>

                {/* ---------------- TRASH ---------------- */}
                {adminTab === "trash" && (
                  <>
                    <div className="sectionTitle">Trash (Undo Delete)</div>
                    <div className="actionsRow mt10">
                      <button className="btn danger" onClick={clearTrash}>
                        Clear Trash Permanently
                      </button>
                    </div>

                    <div className="tableTitle">Deleted Admins</div>
                    {trashAdmins.length === 0 ? (
                      <div className="muted">No deleted admins.</div>
                    ) : (
                      <div className="list">
                        {trashAdmins.map((t, i) => (
                          <div key={i} className="item flexBetweenGap12">
                            <div className="flex1">
                              <div>
                                <b>Deleted At:</b> {formatPH(t.deletedAt)}
                              </div>
                              <div>
                                <b>Admin:</b> {fullNameOf(t.payload)} • ID: {t.payload?.id}
                              </div>
                            </div>
                            <button className="btn primary" style={miniBtn} title="Restore" onClick={() => restoreTrashAdmin(t)}>
                              ↺
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="tableTitle">Deleted Employees</div>
                    {trashEmployees.length === 0 ? (
                      <div className="muted">No deleted employees.</div>
                    ) : (
                      <div className="list">
                        {trashEmployees.map((t, i) => (
                          <div key={i} className="item flexBetweenGap12">
                            <div className="flex1">
                              <div>
                                <b>Deleted At:</b> {formatPH(t.deletedAt)}
                              </div>
                              <div>
                                <b>Employee:</b> {fullNameOf(t.payload)} • ID: {t.payload?.id}
                              </div>
                            </div>
                            <button className="btn primary" style={miniBtn} title="Restore" onClick={() => restoreTrashEmployee(t)}>
                              ↺
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="tableTitle">Deleted Records</div>
                    {trashRecords.length === 0 ? (
                      <div className="muted">No deleted records.</div>
                    ) : (
                      <div className="list">
                        {trashRecords.map((t, i) => (
                          <div key={i} className="item flexBetweenGap12">
                            <div className="flex1">
                              <div>
                                <b>Deleted At:</b> {formatPH(t.deletedAt)}
                              </div>
                              <div>
                                <b>Type:</b> {t.type}
                              </div>
                            </div>
                            <button className="btn primary" style={miniBtn} title="Restore" onClick={() => restoreTrashRecordItem(t)}>
                              ↺
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ---------------- ADMINS ---------------- */}
                {adminTab === "admins" && (
                  <>
                    <div className="sectionTitle">All Admin Accounts</div>

                    <div className="field mt8">
                      <div className="label">Search (Admin ID / Full Name)</div>
                      <TextInput value={empSearch} placeholder="Type ID or name..." onChange={(e) => setEmpSearch(e.target.value)} />
                    </div>

                    {filteredAdmins.length === 0 ? (
                      <div className="muted">No matching admins.</div>
                    ) : (
                      <div className="list">
                        {filteredAdmins.map((adm) => (
                          <div key={adm.id} className="item">
                            <div className="flexBetweenGap12">
                              <div className="rowGap12CenterFlex1">
                                <div className="avatar avatar52">
                                  {adm.photo ? (
                                    <img src={adm.photo} alt="admin" className="avatarImg" />
                                  ) : (
                                    <div className="avatarInitials">
                                      {(adm.firstName?.[0] || "A").toUpperCase()}
                                      {(adm.lastName?.[0] || "").toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="fw900">{fullNameOf(adm)}</div>
                                  <div className="muted">ADMIN • ID: {adm.id}</div>
                                </div>
                              </div>

                              <button className="btn primary" style={miniBtn} title="Edit Admin Account" onClick={() => adminOpenEditUser(adm)}>
                                ✎
                              </button>
                              <button className="btn danger" style={miniBtn} title="Delete Admin Account" onClick={() => adminDeleteAdminAccount(adm.id)}>
                                −
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ---------------- EMPLOYEES ---------------- */}
                {adminTab === "employees" && (
                  <>
                    <div className="sectionTitle">All Employee Accounts</div>

                    <div className="field mt8">
                      <div className="label">Search (Employee ID / Full Name)</div>
                      <TextInput value={empSearch} placeholder="Type ID or name..." onChange={(e) => setEmpSearch(e.target.value)} />
                    </div>

                    {filteredEmployees.length === 0 ? (
                      <div className="muted">No matching employees.</div>
                    ) : (
                      <div className="list">
                        {filteredEmployees.map((emp) => {
                          const isSelected = String(selectedEmpId) === String(emp.id);
                          return (
                          <div key={emp.id}>
                          <div className="item">
                            <div className="flexBetweenGap12">
                              <div
                                className="cursorPointerFlex1"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedEmpId("");
                                  } else {
                                    setSelectedEmpId(emp.id);
                                    setFilterFrom("");
                                    setFilterTo("");
                                    setMonthPick("");
                                  }
                                }}
                              >
                                <div className="rowGap12Center">
                                  <div className="avatar avatar52">
                                    {emp.photo ? (
                                      <img src={emp.photo} alt="emp" className="avatarImg" />
                                    ) : (
                                      <div className="avatarInitials">
                                        {(emp.firstName?.[0] || "E").toUpperCase()}
                                        {(emp.lastName?.[0] || "").toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="fw900">{fullNameOf(emp)}</div>
                                    <div className="muted">EMPLOYEE • ID: {emp.id}</div>
                                  </div>
                                </div>

                                <div className="mt10">
                                  <div>
                                    <b>Age:</b> {emp.age || "-"}
                                  </div>
                                  <div>
                                    <b>Sex:</b> {emp.sex || "-"}
                                  </div>
                                  <div>
                                    <b>Phone:</b> {emp.phone || "-"}
                                  </div>
                                  <div>
                                    <b>Position:</b> {emp.position || "-"}
                                  </div>
                                </div>
                              </div>

                              <div className="rowGap8Center">
  <button className="btn primary" style={miniBtn} title="Edit Account" onClick={() => adminOpenEditUser(emp)}>
    ✎
  </button>
  <button className="btn danger" style={miniBtn} title="Delete Account" onClick={() => adminDeleteEmployeeAccount(emp.id)}>
    −
  </button>
</div>
                            </div>
                          </div>

                          {/* ===== Inline Selected Employee Details (right below the card) ===== */}
                          {isSelected && selectedEmployee && (
                            <div style={{ background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.18)", borderRadius: 14, padding: "16px 18px", marginTop: 6, marginBottom: 8 }}>
                              <div className="sectionTitle" style={{ marginTop: 0 }}>
                                Work Schedule
                              </div>
                              <div className="item mt10">
                                <div className="rowGap12CenterWrap">
                                  <div className="minW200">
                                    <b>Start Work Time:</b>
                                  </div>
                                  <input type="time" value={empWorkTime} onChange={(e) => setEmpWorkTime(e.target.value)} className="pad8Radius10" />
                                  <button className="btn primary" type="button" onClick={adminSaveEmployeeSchedule}>
                                    Save Schedule
                                  </button>
                                </div>
                              </div>

                              <div className="sectionTitle mt16">
                                Employee Attendance (Preview + PDF)
                              </div>

                              <div className="grid2 mt12">
                                <div className="field">
                                  <div className="label">Month (optional)</div>
                                  <select value={monthPick} onChange={(e) => setMonthPick(e.target.value)}>
                                    <option value="">All months</option>
                                    {selectedEmployeeMonths.map((m) => (
                                      <option key={m} value={m}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="field">
                                  <div className="label">From (optional)</div>
                                  <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                                </div>

                                <div className="field">
                                  <div className="label">To (optional)</div>
                                  <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
                                </div>

                                <div className="field">
                                  <div className="label">Actions</div>
                                  <button className="btn ghost" type="button" onClick={() => { setMonthPick(""); setFilterFrom(""); setFilterTo(""); }}>
                                    Clear Filters
                                  </button>
                                </div>
                              </div>

                              <div className="item mt10">
                                <div>
                                  <b>Total Days Present:</b> {selectedEmployeeTotals.daysPresent}
                                </div>
                                <div>
                                  <b>Total Hours (finished only):</b> {selectedEmployeeTotals.totalHours.toFixed(2)} hrs
                                </div>
                              </div>

                              <div className="actionsRow mt12">
                                <button className="btn primary" onClick={printEmployeePdf}>
                                  Print Attendance (PDF)
                                </button>
                                <button className="btn primary" onClick={exportEmployeeExcel}>
                                  Export Excel (.xlsx)
                                </button>
                                <button className="btn ghost" onClick={() => setSelectedEmpId("")}>
                                  Close
                                </button>
                              </div>
                            </div>
                          )}
                          </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Employee details are now shown inline below each card */}
                  </>
                )}

                {/* ---------------- FOLDERS ---------------- */}
                {adminTab === "folders" && (
                  <>
                    <div className="sectionTitle">Employee Monitoring - Daily Attendance Records</div>

                    {/* DATE PICKER SEARCH (like your pic) */}
                    <div className="field mt8">
                      <div className="label">Search Date</div>
                      <input
                        type="date"
                        value={folderDatePick}
                        onChange={(e) => setFolderDatePick(e.target.value)}
                      />
                      <div className="mt8">
                        <button className="btn ghost" type="button" onClick={() => setFolderDatePick("")}>
                          Clear Date Search
                        </button>
                      </div>
                    </div>

                    {filteredFolderDates.length === 0 ? (
                      <div className="muted">No matching date folders.</div>
                    ) : (
                      <div className="list">
                        {filteredFolderDates.map((date) => {
                          const dayLogs = dailyFolders.map.get(date) || [];
                          const isCollapsed = !expandedDates.has(date);

                          return (
                            <div key={date} className="item">
                              {/* header: folder title + actions */}
                              <div className="folderHeader">
                    <div className="folderTitle" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      {date}
                    </div>

                                <div className="folderActionsRow">
                                  <button
                                    className="btn ghost"
                                    type="button"
                                    style={smallActionBtnStyle}
                                    onClick={() => toggleFolder(date)}
                                  >
                                    {isCollapsed ? "Expand" : "Collapse"}
                                  </button>

                                  {/* KEEP: Daily Print PDF*/}
                                  <button
                                    className="btn primary"
                                    type="button"
                                    style={smallActionBtnStyle}
                                    onClick={() => printDailyFolderPdf(date, dayLogs)}
                                    disabled={dayLogs.length === 0}
                                  >
                                    Print (PDF)
                                  </button>

<button
  className="btn primary"
  type="button"
  style={smallActionBtnStyle}
  onClick={() => exportDailyFolderExcel(date, dayLogs)}
  disabled={dayLogs.length === 0}
>
  Export Excel
</button>
                                </div>
                              </div>

                              {/* content collapsible */}
                              {!isCollapsed && (
                                <div className="list mt10">
                                  {dayLogs.map((r, i) => {
                                    const emp = usersMap.get("employee_" + r.id) || null;
                                    const finished = !!r.timeOut;
                                    const durMs = finished ? Math.max(0, r.timeOut - r.timeIn) : 0;
                                    const status = lateInfo(r.timeIn, emp).statusText;

                                    return (
                                      <div key={i} className="item flexBetweenGap12">
                                        <div className="flex1">
                                          <div>
                                            <b>Employee Name:</b> {emp ? fullNameOf(emp) : "UNKNOWN"}
                                          </div>
                                          <div>
                                            <b>Employee ID:</b> {r.id}
                                          </div>
                                          
                                          
                                          
                                          <div>
                                            <b>Status:</b> {status}
                                          </div>
                                          <div>
                                            <b>Time In:</b> {formatPH(r.timeIn)}
                                          </div>

                                          <div>
                                            <b>Time Out:</b>{" "}
                                            {r.timeOut ? formatPH(r.timeOut) : `Active • Counting: ${formatHMS(now - r.timeIn)}`}
                                          </div>

                                          <div>
                                            <b>Total:</b>{" "}
                                            {finished
                                              ? `${formatHoursMinutes(durMs)} (${hoursFromMs(durMs).toFixed(2)} hrs)`
                                              : `${formatHMS(now - r.timeIn)} (ACTIVE)`}
                                          </div>
                                        </div>

                                        <button className="btn danger" style={miniBtn} title="Delete Record" onClick={() => adminDeleteOneRecord(r)}>
                                          −
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Admin Edit User Modal ─────────────────────────────────────── */}
        {editTarget && editTargetForm && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}>
            <div style={{
              background: "linear-gradient(145deg,#0d1627,#111a30)",
              border: "1px solid rgba(56,189,248,0.25)",
              borderRadius: 18, padding: 24, width: "100%", maxWidth: 480,
              boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
              maxHeight: "90vh", overflowY: "auto",
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
                <div style={{ fontWeight:800, fontSize:16, color:"rgba(255,255,255,0.92)", display:"flex", alignItems:"center", gap:8 }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit {editTarget.role === "admin" ? "Admin" : "Employee"} Account
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", background:"rgba(255,255,255,0.07)", borderRadius:6, padding:"3px 8px" }}>
                  ID: {editTarget.id}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[["firstName","First Name"],["middleName","Middle Name"],["lastName","Last Name"]].map(([k,lbl])=>(
                  <div key={k} style={{ gridColumn: k==="middleName"?"1/-1":"auto" }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.50)", marginBottom:4 }}>{lbl}</div>
                    <input
                      value={editTargetForm[k]}
                      onChange={e=>setEditTargetForm({...editTargetForm,[k]:e.target.value})}
                      style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:13 }}
                    />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.50)", marginBottom:4 }}>Age</div>
                  <input
                    type="number" min="1" max="120"
                    value={editTargetForm.age}
                    onChange={e=>setEditTargetForm({...editTargetForm,age:e.target.value.replace(/[^0-9]/g,"")})}
                    style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:13 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.50)", marginBottom:4 }}>Sex</div>
                  <select
                    value={editTargetForm.sex}
                    onChange={e=>setEditTargetForm({...editTargetForm,sex:e.target.value})}
                    style={{ width:"100%", boxSizing:"border-box", background:"rgba(13,22,39,1)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:13 }}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.50)", marginBottom:4 }}>Phone (11 digits)</div>
                  <input
                    value={editTargetForm.phone}
                    maxLength={11}
                    onChange={e=>setEditTargetForm({...editTargetForm,phone:e.target.value.replace(/[^0-9]/g,"").slice(0,11)})}
                    style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:13 }}
                  />
                </div>
                {editTarget.role === "employee" && (
                  <div style={{ gridColumn:"1/-1" }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.50)", marginBottom:4 }}>Position</div>
                    <input
                      value={editTargetForm.position}
                      onChange={e=>setEditTargetForm({...editTargetForm,position:e.target.value})}
                      style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:13 }}
                    />
                  </div>
                )}
                {editTarget.role === "employee" && (
                  <div style={{ gridColumn:"1/-1" }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.50)", marginBottom:4 }}>Work Schedule Start Time</div>
                    <input
                      type="time"
                      value={editTargetForm.scheduleTime}
                      onChange={e=>setEditTargetForm({...editTargetForm,scheduleTime:e.target.value})}
                      style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:13 }}
                    />
                  </div>
                )}
              </div>

              {/* Profile Picture */}
              <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", marginBottom: 8 }}>Profile Picture</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {editTargetForm.photo ? (
                    <img src={editTargetForm.photo} alt="Profile" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(56,189,248,0.40)", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0, border: "2px solid rgba(56,189,248,0.40)" }}>
                      {(editTargetForm.firstName?.[0] || "?").toUpperCase()}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", background: "linear-gradient(135deg,rgba(56,189,248,0.15),rgba(124,131,255,0.15))", border: "1px solid rgba(56,189,248,0.30)", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 600, color: "#38bdf8" }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      Upload Photo
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) return alert("Please select an image file.");
                        const MAX = 240;
                        try {
                          const bitmap = await createImageBitmap(file);
                          const ratio = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
                          const w = Math.max(1, Math.round(bitmap.width * ratio));
                          const h = Math.max(1, Math.round(bitmap.height * ratio));
                          const canvas = document.createElement("canvas");
                          canvas.width = w; canvas.height = h;
                          const ctx = canvas.getContext("2d");
                          if (!ctx) throw new Error("Canvas not supported");
                          ctx.drawImage(bitmap, 0, 0, w, h);
                          const compressed = canvas.toDataURL("image/jpeg", 0.78);
                          setEditTargetForm(prev => ({ ...prev, photo: compressed }));
                        } catch {
                          const reader = new FileReader();
                          reader.onload = () => setEditTargetForm(prev => ({ ...prev, photo: String(reader.result || "") }));
                          reader.readAsDataURL(file);
                        }
                        e.target.value = "";
                      }} />
                    </label>
                    {editTargetForm.photo && (
                      <button type="button" onClick={() => setEditTargetForm(prev => ({ ...prev, photo: "" }))} style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "#f87171", cursor: "pointer" }}>
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display:"flex", gap:10, marginTop:18 }}>
                <button
                  onClick={adminSaveEditTarget}
                  disabled={editTargetSaving}
                  style={{ flex:1, background:"linear-gradient(135deg,#38bdf8,#7c83ff)", border:"none", borderRadius:10, padding:"11px 0", color:"#fff", fontWeight:700, fontSize:13, cursor:editTargetSaving?"not-allowed":"pointer", opacity:editTargetSaving?0.6:1 }}
                >
                  {editTargetSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={adminCloseEditUser}
                  style={{ padding:"11px 20px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:10, color:"rgba(255,255,255,0.55)", fontWeight:600, fontSize:13, cursor:"pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </Shell>
    );

  return null;
}
