import { useEffect, useState } from 'react';
import { servicesAPI } from '../services/api';
import { buildPriceListSectionsFromServices } from '../utils/servicePricing';

export function useServiceCatalog() {
  const [services, setServices] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [depositPercent, setDepositPercent] = useState(0.8);
  const [contact, setContact] = useState(null);
  const [hoursSummary, setHoursSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await servicesAPI.getCatalog();
      setServices(data.services || []);
      setPriceList(data.priceList || buildPriceListSectionsFromServices(data.services));
      setDepositPercent(data.depositPercent ?? 0.8);
      setContact(data.contact || null);
      setHoursSummary(data.hoursSummary || []);
    } catch (e) {
      setError(e);
      setServices([]);
      setPriceList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { services, priceList, depositPercent, contact, hoursSummary, loading, error, reload };
}
