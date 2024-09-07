import { useNavigate, useParams } from '@remix-run/react';
import { useEffect } from 'react';

export default function Index() {
  const params = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/${params.orgShortcode}/${params.spaceShortcode}/convo`);
  }, [navigate, params.orgShortcode, params.spaceShortcode]);
  return null;
}
