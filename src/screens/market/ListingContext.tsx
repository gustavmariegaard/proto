import { Link } from 'react-router-dom';
import { formatPrice, type Listing } from '../../data/market';
import './ListingContext.css';

/** Lille annoncekort i en samtale, der er åbnet fra Torvet. */
export function ListingContext({ listing }: { listing: Listing }) {
  return (
    <Link to={`/torvet/${listing.id}`} className="listing-ctx" aria-label={`Annonce: ${listing.title}, ${formatPrice(listing.price)}`}>
      <img className="listing-ctx__img" src={listing.images[0]} alt="" />
      <span className="listing-ctx__text" aria-hidden="true">
        <span className="t-label listing-ctx__title">{listing.title}</span>
        <span className="t-caption listing-ctx__price">{formatPrice(listing.price)}</span>
      </span>
    </Link>
  );
}
