"use client";

import { useState, useEffect } from "react";
import {
  Compass,
  Search,
  MapPin,
  Cpu,
  Globe,
  Server,
  RefreshCw,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IpData {
  ip: string;
  country: string;
  country_code: string;
  region: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  isp: string;
  org?: string;
  timezone: string;
}

export default function IpLocatorPage() {
  const [ipInput, setIpInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ipData, setIpData] = useState<IpData | null>(null);

  // Auto detect user IP on load
  useEffect(() => {
    fetchIpDetails(""); // Empty string auto-detects client IP
  }, []);

  const fetchIpDetails = async (targetIp: string) => {
    setIsLoading(true);
    const cleanedIp = targetIp.trim();

    // Rotated pool of free keyless geo IP locator APIs
    const apiEndpoints = [
      async () => {
        const res = await fetch(`https://ipapi.co/${cleanedIp ? cleanedIp + "/" : ""}json/`);
        if (!res.ok) throw new Error("ipapi failed");
        const d = await res.json();
        return {
          ip: d.ip,
          country: d.country_name,
          country_code: d.country_code,
          region: d.region,
          city: d.city,
          zip: d.postal,
          lat: d.latitude,
          lon: d.longitude,
          isp: d.org || d.asn,
          timezone: d.timezone
        };
      },
      async () => {
        const res = await fetch(`https://freeipapi.com/api/json/${cleanedIp}`);
        if (!res.ok) throw new Error("freeipapi failed");
        const d = await res.json();
        return {
          ip: d.ipAddress,
          country: d.countryName,
          country_code: d.countryCode,
          region: d.regionName,
          city: d.cityName,
          zip: d.zipCode,
          lat: d.latitude,
          lon: d.longitude,
          isp: d.isp || "Local ISP",
          timezone: d.timeZone
        };
      }
    ];

    let success = false;
    for (const apiCall of apiEndpoints) {
      try {
        const data = await apiCall();
        setIpData(data);
        if (!ipInput && data.ip) {
          setIpInput(data.ip);
        }
        success = true;
        break; // Successfully got geo-IP data, stop pool loop
      } catch (err) {
        console.warn("Geo-IP fallback trigger on API pool:", err);
      }
    }

    setIsLoading(false);
    if (!success) {
      toast.error("Failed to query IP location via all fallbacks. Please verify input or try again later.");
    } else {
      toast.success("IP location parsed successfully!");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIpDetails(ipInput);
  };

  return (
    <div className='container mx-auto px-6 py-12 max-w-5xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <Compass className='h-3.5 w-3.5' />
            Network Suite
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            IP <span className='gradient-text'>Locator.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Fetch detailed geospatial coordinates, internet service provider
            details, and physical maps locally.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Search Panel */}
        <div className='lg:col-span-7 space-y-6'>
          <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow sm:p-1'>
            <form
              onSubmit={handleSearch}
              className='flex gap-3'>
              <div className='relative flex-1 items-center flex'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-pw-muted' />
                <Input
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder='Enter IP Address'
                  className='pl-12 bg-white/5 border-white/10 h-11 no-outline text-sm focus:border-pw-primary rounded-2xl'
                />
              </div>
              <Button
                type='submit'
                disabled={isLoading}
                className='btn-primary h-10 px-2 sm:px-6 rounded-4xl font-bold flex gap-2 shrink-0'>
                {isLoading ?
                  <RefreshCw className='h-5 w-5 animate-spin' />
                : <Search className='h-5 w-5' />}
              </Button>
            </form>

            {ipData && (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5'>
                <div className='p-2 pl-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-start gap-3'>
                  <Globe className='h-5 w-5 text-pw-primary shrink-0 mt-0.5' />
                  <div>
                    <p className='text-[10px] text-pw-muted font-bold uppercase tracking-wider'>
                      Country / Region
                    </p>
                    <span className='text-sm font-bold text-pw-text'>
                      {ipData?.country} ({ipData?.country_code}),{' '}
                      {ipData?.region}
                    </span>
                  </div>
                </div>

                <div className='p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-start gap-3'>
                  <MapPin className='h-5 w-5 text-pw-secondary shrink-0 mt-0.5' />
                  <div>
                    <p className='text-[10px] text-pw-muted font-bold uppercase tracking-wider'>
                      City / ZIP
                    </p>
                    <span className='text-sm font-bold text-pw-text'>
                      {ipData.city || 'Unknown City'} {ipData.zip}
                    </span>
                  </div>
                </div>

                <div className='p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-start gap-3'>
                  <Server className='h-5 w-5 text-pw-success shrink-0 mt-0.5' />
                  <div>
                    <p className='text-[10px] text-pw-muted font-bold uppercase tracking-wider'>
                      ISP / Organization
                    </p>
                    <span
                      className='text-sm font-bold text-pw-text truncate block max-w-[150px]'
                      title={ipData.isp}>
                      {ipData.isp}
                    </span>
                  </div>
                </div>

                <div className='p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-start gap-3'>
                  <Cpu className='h-5 w-5 text-pw-warning shrink-0 mt-0.5' />
                  <div>
                    <p className='text-[10px] text-pw-muted font-bold uppercase tracking-wider'>
                      Coordinates / TZ
                    </p>
                    <span className='text-xs font-mono font-bold text-pw-text block mt-1'>
                      {ipData.lat.toFixed(4)}, {ipData.lon.toFixed(4)}
                    </span>
                    <span className='text-[9px] text-pw-muted block mt-0.5'>
                      {ipData.timezone}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Maps Embed Panel */}
        <div className='lg:col-span-5 flex flex-col gap-6'>
          <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow sm:p-4 sm:bg-pw-surface/50 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden'>
            {ipData ?
              <iframe
                title='Leaflet IP Map'
                width='100%'
                height='280'
                frameBorder='0'
                scrolling='no'
                marginHeight={0}
                marginWidth={0}
                allowTransparency
                className='rounded-xl border border-white/10'
                src={`https://maps.google.com/maps?q=${ipData.lat},${ipData.lon}&z=10&output=embed`}
              />
            : <div className='text-center p-8'>
                <MapPin className='h-10 w-10 text-pw-muted/20 mx-auto mb-4 animate-bounce' />
                <p className='text-sm text-pw-muted'>
                  Map will instantly render upon successfully parsing input IP
                  coordinates.
                </p>
              </div>
            }
          </Card>

          <div className='bg-pw-primary/5 border border-pw-primary/20 rounded-2xl p-4 sm:p-6 flex items-start gap-3'>
            <Info className='h-5 w-5 text-pw-primary shrink-0 mt-0.5' />
            <p className='text-xs text-pw-muted leading-relaxed'>
              Your browser utilizes keyless, rate-limit-protected IP mapping
              services. Fallback rotation is processed client-side.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
