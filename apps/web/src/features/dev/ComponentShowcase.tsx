/**
 * Component Showcase - Dev Page
 *
 * A simple page to preview all UI components.
 * Access at /dev/components
 */

import React, { useState } from 'react';
import {
  Button,
  Input,
  Modal,
  Table,
  Card,
  Spinner,
  PageHeader,
  FormField,
  Select,
  SearchInput,
} from '../../components';
import './ComponentShowcase.scss';

interface DemoRow {
  id: number;
  name: string;
  status: string;
  quantity: number;
}

const demoData: DemoRow[] = [
  { id: 1, name: 'Work Order 001', status: 'Active', quantity: 1500 },
  { id: 2, name: 'Work Order 002', status: 'Pending', quantity: 2300 },
  { id: 3, name: 'Work Order 003', status: 'Completed', quantity: 800 },
];

const selectOptions = [
  { value: 'machine1', label: 'Makine 1' },
  { value: 'machine2', label: 'Makine 2' },
  { value: 'machine3', label: 'Makine 3' },
];

export function ComponentShowcase(): React.ReactElement {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="showcase">
      <PageHeader
        title="Component Showcase"
        subtitle="Preview all UI components"
        actions={<Button variant="primary">Action Button</Button>}
      />

      {/* Buttons Section */}
      <section className="showcase__section">
        <h2>Buttons</h2>
        <div className="showcase__row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
        <div className="showcase__row">
          <Button size="small">Small</Button>
          <Button size="medium">Medium</Button>
          <Button size="large">Large</Button>
        </div>
        <div className="showcase__row">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button fullWidth>Full Width</Button>
        </div>
      </section>

      {/* Inputs Section */}
      <section className="showcase__section">
        <h2>Inputs</h2>
        <div className="showcase__grid">
          <FormField label="Text Input" htmlFor="text-input">
            <Input
              id="text-input"
              placeholder="Enter text..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </FormField>
          <FormField label="With Error" htmlFor="error-input" error="Bu alan zorunludur">
            <Input id="error-input" error placeholder="Error state" />
          </FormField>
          <FormField label="Disabled" htmlFor="disabled-input">
            <Input id="disabled-input" disabled placeholder="Disabled" />
          </FormField>
          <FormField label="Number Input" htmlFor="number-input" helpText="Turkish number format">
            <Input id="number-input" type="number" placeholder="0" />
          </FormField>
        </div>
      </section>

      {/* Select Section */}
      <section className="showcase__section">
        <h2>Select</h2>
        <div className="showcase__grid">
          <FormField label="Machine Selection" htmlFor="select-demo">
            <Select
              id="select-demo"
              options={selectOptions}
              placeholder="Makine secin..."
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              fullWidth
            />
          </FormField>
          <FormField label="With Error" htmlFor="select-error" error="Secim yapiniz">
            <Select
              id="select-error"
              options={selectOptions}
              placeholder="Select..."
              error
              fullWidth
            />
          </FormField>
        </div>
      </section>

      {/* Search Input Section */}
      <section className="showcase__section">
        <h2>Search Input</h2>
        <div className="showcase__grid">
          <div>
            <p className="showcase__label">Default</p>
            <SearchInput
              onSearch={(v) => console.log('Search:', v)}
              placeholder="Tabloda Ara..."
            />
          </div>
          <div>
            <p className="showcase__label">Loading</p>
            <SearchInput
              onSearch={() => {}}
              placeholder="Searching..."
              loading
            />
          </div>
        </div>
        {searchValue && <p>Searched: {searchValue}</p>}
      </section>

      {/* Cards Section */}
      <section className="showcase__section">
        <h2>Cards</h2>
        <div className="showcase__grid">
          <Card title="Basic Card" subtitle="With subtitle">
            <p>Card content goes here. This is a basic card with title and subtitle.</p>
          </Card>
          <Card
            title="Card with Actions"
            headerActions={<Button size="small" variant="ghost">Edit</Button>}
            footer={<span>Footer content</span>}
          >
            <p>This card has header actions and a footer.</p>
          </Card>
          <Card
            title="Clickable Card"
            onClick={() => alert('Card clicked!')}
          >
            <p>Click me! I have hover effects.</p>
          </Card>
        </div>
      </section>

      {/* Table Section */}
      <section className="showcase__section">
        <h2>Table</h2>
        <Table
          columns={[
            { key: 'id', header: 'ID', width: '80px' },
            { key: 'name', header: 'Name' },
            { key: 'status', header: 'Status', align: 'center' },
            { key: 'quantity', header: 'Quantity', align: 'right' },
          ]}
          data={demoData}
        />
        <h3 style={{ marginTop: '1rem' }}>Loading State</h3>
        <Table
          columns={[
            { key: 'id', header: 'ID' },
            { key: 'name', header: 'Name' },
          ]}
          data={demoData}
          loading
        />
        <h3 style={{ marginTop: '1rem' }}>Empty State</h3>
        <Table
          columns={[
            { key: 'id', header: 'ID' },
            { key: 'name', header: 'Name' },
          ]}
          data={[]}
          emptyMessage="Veri bulunamadi"
        />
      </section>

      {/* Spinners Section */}
      <section className="showcase__section">
        <h2>Spinners</h2>
        <div className="showcase__row">
          <div className="showcase__spinner-demo">
            <Spinner size="small" />
            <span>Small</span>
          </div>
          <div className="showcase__spinner-demo">
            <Spinner size="medium" />
            <span>Medium</span>
          </div>
          <div className="showcase__spinner-demo">
            <Spinner size="large" />
            <span>Large</span>
          </div>
        </div>
        <div className="showcase__row">
          <Spinner showLabel label="Yukleniyor..." />
        </div>
        <div className="showcase__dark-bg">
          <Spinner color="white" showLabel label="White spinner on dark" />
        </div>
      </section>

      {/* Modal Section */}
      <section className="showcase__section">
        <h2>Modal</h2>
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example Modal"
          size="medium"
        >
          <p>This is modal content. You can put any content here.</p>
          <p>Click outside or press Escape to close.</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Iptal
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Kaydet
            </Button>
          </div>
        </Modal>
      </section>

      {/* Page Header Variants */}
      <section className="showcase__section">
        <h2>Page Header Variants</h2>
        <Card padding="none" noShadow>
          <PageHeader
            title="With Back Button"
            subtitle="And a subtitle"
            backTo="/dev/components"
            backLabel="Geri"
          />
        </Card>
        <Card padding="none" noShadow style={{ marginTop: '1rem' }}>
          <PageHeader
            title="With Actions"
            actions={
              <>
                <Button variant="secondary" size="small">Cancel</Button>
                <Button variant="primary" size="small">Save</Button>
              </>
            }
          />
        </Card>
      </section>
    </div>
  );
}
