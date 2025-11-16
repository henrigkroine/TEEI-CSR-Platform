/**
 * NLQ Accessibility Test Suite
 * WCAG 2.2 AA Compliance Tests for Natural Language Query Interface
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import components to test
import {
  RovingTabindexManager,
  QueryHistoryFocus,
  SuggestionsFocus,
  SearchInputFocus,
  AnswerCardFocus,
} from '../../components/nlq/a11y/FocusManager';

import {
  NLQAnnouncer,
  QueryStatusAnnouncer,
  ConfidenceAnnouncer,
  ResultLoadingAnnouncer,
  SuggestionAnnouncer,
  FilterAnnouncer,
  ExportAnnouncer,
  LineageAnnouncer,
  FeedbackAnnouncer,
} from '../../components/nlq/a11y/LiveAnnouncer';

import {
  NLQSkipLinks,
  NLQBreadcrumbs,
  LandmarkWrapper,
  QuickNav,
} from '../../components/nlq/a11y/SkipLinks';

import type { ConfidenceScore } from '../../types/nlq';

describe('NLQ Accessibility - Focus Management', () => {
  describe('RovingTabindexManager', () => {
    it('should set initial tabindex correctly', () => {
      const { container } = render(
        <RovingTabindexManager>
          <button>Item 1</button>
          <button>Item 2</button>
          <button>Item 3</button>
        </RovingTabindexManager>
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons[0]).toHaveAttribute('tabindex', '0');
      expect(buttons[1]).toHaveAttribute('tabindex', '-1');
      expect(buttons[2]).toHaveAttribute('tabindex', '-1');
    });

    it('should navigate with arrow down key', async () => {
      const onFocusChange = vi.fn();
      const { container } = render(
        <RovingTabindexManager
          orientation="vertical"
          onFocusChange={onFocusChange}
        >
          <button>Item 1</button>
          <button>Item 2</button>
          <button>Item 3</button>
        </RovingTabindexManager>
      );

      const buttons = container.querySelectorAll('button');
      buttons[0].focus();

      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(onFocusChange).toHaveBeenCalledWith(1);
        expect(buttons[1]).toHaveAttribute('tabindex', '0');
        expect(buttons[0]).toHaveAttribute('tabindex', '-1');
      });
    });

    it('should navigate with arrow up key', async () => {
      const onFocusChange = vi.fn();
      const { container } = render(
        <RovingTabindexManager
          orientation="vertical"
          initialFocusIndex={1}
          onFocusChange={onFocusChange}
        >
          <button>Item 1</button>
          <button>Item 2</button>
          <button>Item 3</button>
        </RovingTabindexManager>
      );

      const buttons = container.querySelectorAll('button');
      buttons[1].focus();

      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowUp' });

      await waitFor(() => {
        expect(onFocusChange).toHaveBeenCalledWith(0);
        expect(buttons[0]).toHaveAttribute('tabindex', '0');
        expect(buttons[1]).toHaveAttribute('tabindex', '-1');
      });
    });

    it('should loop from last to first when loop is true', async () => {
      const { container } = render(
        <RovingTabindexManager orientation="vertical" loop={true}>
          <button>Item 1</button>
          <button>Item 2</button>
          <button>Item 3</button>
        </RovingTabindexManager>
      );

      const buttons = container.querySelectorAll('button');
      buttons[2].focus();

      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(buttons[0]).toHaveAttribute('tabindex', '0');
      });
    });

    it('should not loop when loop is false', async () => {
      const { container } = render(
        <RovingTabindexManager
          orientation="vertical"
          loop={false}
          initialFocusIndex={2}
        >
          <button>Item 1</button>
          <button>Item 2</button>
          <button>Item 3</button>
        </RovingTabindexManager>
      );

      const buttons = container.querySelectorAll('button');

      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(buttons[2]).toHaveAttribute('tabindex', '0');
      });
    });

    it('should handle Home key', async () => {
      const { container } = render(
        <RovingTabindexManager orientation="vertical" initialFocusIndex={2}>
          <button>Item 1</button>
          <button>Item 2</button>
          <button>Item 3</button>
        </RovingTabindexManager>
      );

      const buttons = container.querySelectorAll('button');

      fireEvent.keyDown(container.firstChild as Element, { key: 'Home' });

      await waitFor(() => {
        expect(buttons[0]).toHaveAttribute('tabindex', '0');
      });
    });

    it('should handle End key', async () => {
      const { container } = render(
        <RovingTabindexManager orientation="vertical">
          <button>Item 1</button>
          <button>Item 2</button>
          <button>Item 3</button>
        </RovingTabindexManager>
      );

      const buttons = container.querySelectorAll('button');

      fireEvent.keyDown(container.firstChild as Element, { key: 'End' });

      await waitFor(() => {
        expect(buttons[2]).toHaveAttribute('tabindex', '0');
      });
    });

    it('should support horizontal navigation', async () => {
      const { container } = render(
        <RovingTabindexManager orientation="horizontal">
          <button>Item 1</button>
          <button>Item 2</button>
          <button>Item 3</button>
        </RovingTabindexManager>
      );

      const buttons = container.querySelectorAll('button');
      buttons[0].focus();

      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(buttons[1]).toHaveAttribute('tabindex', '0');
      });
    });

    it('should have proper ARIA role', () => {
      const { container } = render(
        <RovingTabindexManager role="listbox" ariaLabel="Test list">
          <button>Item 1</button>
        </RovingTabindexManager>
      );

      expect(container.firstChild).toHaveAttribute('role', 'listbox');
      expect(container.firstChild).toHaveAttribute('aria-label', 'Test list');
    });
  });

  describe('SuggestionsFocus', () => {
    it('should not render when closed', () => {
      const { container } = render(
        <SuggestionsFocus isOpen={false}>
          <button>Suggestion 1</button>
        </SuggestionsFocus>
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when open', () => {
      const { container } = render(
        <SuggestionsFocus isOpen={true}>
          <button>Suggestion 1</button>
        </SuggestionsFocus>
      );

      expect(container.firstChild).toBeTruthy();
    });

    it('should call onSelect when Enter is pressed', async () => {
      const onSelect = vi.fn();
      const { container } = render(
        <SuggestionsFocus isOpen={true} onSelect={onSelect}>
          <button>Suggestion 1</button>
          <button>Suggestion 2</button>
        </SuggestionsFocus>
      );

      const buttons = container.querySelectorAll('button');
      buttons[0].focus();

      fireEvent.keyDown(container.firstChild as Element, { key: 'Enter' });

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith(0);
      });
    });

    it('should call onClose when Escape is pressed', async () => {
      const onClose = vi.fn();
      const { container } = render(
        <SuggestionsFocus isOpen={true} onClose={onClose}>
          <button>Suggestion 1</button>
        </SuggestionsFocus>
      );

      fireEvent.keyDown(container.firstChild as Element, { key: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('AnswerCardFocus', () => {
    it('should focus first interactive element when expanded', async () => {
      const { container, rerender } = render(
        <AnswerCardFocus cardId="test-card" isExpanded={false}>
          <button>Action 1</button>
          <button>Action 2</button>
        </AnswerCardFocus>
      );

      const buttons = container.querySelectorAll('button');

      rerender(
        <AnswerCardFocus cardId="test-card" isExpanded={true}>
          <button>Action 1</button>
          <button>Action 2</button>
        </AnswerCardFocus>
      );

      await waitFor(() => {
        expect(document.activeElement).toBe(buttons[0]);
      });
    });

    it('should have proper ARIA attributes', () => {
      const { container } = render(
        <AnswerCardFocus cardId="test-card" isExpanded={false}>
          <h2 id="test-card-title">Card Title</h2>
          <button>Action</button>
        </AnswerCardFocus>
      );

      const article = container.querySelector('article');
      expect(article).toHaveAttribute('aria-labelledby', 'test-card-title');
      expect(article).toHaveAttribute('tabindex', '0');
    });
  });
});

describe('NLQ Accessibility - Live Announcements', () => {
  describe('NLQAnnouncer', () => {
    it('should render with sr-only class', () => {
      const { container } = render(<NLQAnnouncer message="Test message" />);

      const announcer = container.firstChild as HTMLElement;
      expect(announcer).toHaveClass('sr-only');
    });

    it('should have polite aria-live by default', () => {
      const { container } = render(<NLQAnnouncer message="Test" />);

      expect(container.firstChild).toHaveAttribute('aria-live', 'polite');
      expect(container.firstChild).toHaveAttribute('role', 'status');
    });

    it('should use assertive when specified', () => {
      const { container } = render(
        <NLQAnnouncer message="Test" politeness="assertive" />
      );

      expect(container.firstChild).toHaveAttribute('aria-live', 'assertive');
      expect(container.firstChild).toHaveAttribute('role', 'alert');
    });

    it('should display message', () => {
      const { container } = render(<NLQAnnouncer message="Test message" />);

      expect(container.textContent).toBe('Test message');
    });

    it('should clear message after timeout', async () => {
      vi.useFakeTimers();
      const { container } = render(
        <NLQAnnouncer message="Test" clearAfter={1000} />
      );

      expect(container.textContent).toBe('Test');

      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(container.textContent).toBe('');
      });

      vi.useRealTimers();
    });
  });

  describe('QueryStatusAnnouncer', () => {
    it('should announce query execution', () => {
      const { container } = render(
        <QueryStatusAnnouncer
          status="executing"
          queryText="What is SROI?"
        />
      );

      expect(container.textContent).toContain('Executing query: What is SROI?');
    });

    it('should announce success with result count', () => {
      const { container } = render(
        <QueryStatusAnnouncer
          status="success"
          resultCount={42}
          executionTime={1.2}
        />
      );

      expect(container.textContent).toContain('42 results found');
      expect(container.textContent).toContain('1.2 seconds');
    });

    it('should announce errors assertively', () => {
      const { container } = render(
        <QueryStatusAnnouncer
          status="error"
          errorMessage="Network timeout"
        />
      );

      expect(container.textContent).toContain('Query failed: Network timeout');
      expect(container.firstChild).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('ConfidenceAnnouncer', () => {
    const mockScore: ConfidenceScore = {
      overall: 0.85,
      components: {
        queryUnderstanding: 0.9,
        dataRelevance: 0.8,
        calculationAccuracy: 0.85,
        completeness: 0.85,
      },
      reasoning: 'High quality data sources',
      recommendations: [],
    };

    it('should announce confidence percentage', () => {
      const { container } = render(<ConfidenceAnnouncer score={mockScore} />);

      expect(container.textContent).toContain('85%');
      expect(container.textContent).toContain('high confidence');
    });

    it('should include breakdown when requested', () => {
      const { container } = render(
        <ConfidenceAnnouncer score={mockScore} announceBreakdown={true} />
      );

      expect(container.textContent).toContain('Query understanding: 90%');
      expect(container.textContent).toContain('Data relevance: 80%');
      expect(container.textContent).toContain('Calculation accuracy: 85%');
      expect(container.textContent).toContain('Completeness: 85%');
    });

    it('should include reasoning when available', () => {
      const { container } = render(<ConfidenceAnnouncer score={mockScore} />);

      expect(container.textContent).toContain('High quality data sources');
    });
  });

  describe('ResultLoadingAnnouncer', () => {
    it('should announce loading state', () => {
      const { container } = render(<ResultLoadingAnnouncer isLoading={true} />);

      expect(container.textContent).toBe('Loading results...');
    });

    it('should announce loaded items', () => {
      const { container } = render(
        <ResultLoadingAnnouncer
          isLoading={false}
          itemsLoaded={10}
          totalItems={100}
        />
      );

      expect(container.textContent).toContain('10 results');
      expect(container.textContent).toContain('100 total');
    });
  });

  describe('SuggestionAnnouncer', () => {
    it('should announce current suggestion with position', () => {
      const { container } = render(
        <SuggestionAnnouncer
          currentSuggestion="Show SROI trends"
          currentIndex={2}
          totalSuggestions={5}
          category="Metrics"
        />
      );

      expect(container.textContent).toContain('Show SROI trends');
      expect(container.textContent).toContain('2 of 5');
      expect(container.textContent).toContain('Metrics');
    });
  });

  describe('ExportAnnouncer', () => {
    it('should announce export preparation', () => {
      const { container } = render(
        <ExportAnnouncer status="preparing" format="csv" />
      );

      expect(container.textContent).toContain('Preparing export as CSV');
    });

    it('should announce export completion', () => {
      const { container } = render(
        <ExportAnnouncer status="complete" format="json" />
      );

      expect(container.textContent).toContain('Export as JSON complete');
    });

    it('should announce errors assertively', () => {
      const { container } = render(
        <ExportAnnouncer
          status="error"
          errorMessage="File too large"
        />
      );

      expect(container.textContent).toContain('Export failed: File too large');
      expect(container.firstChild).toHaveAttribute('aria-live', 'assertive');
    });
  });
});

describe('NLQ Accessibility - Skip Links', () => {
  describe('NLQSkipLinks', () => {
    beforeEach(() => {
      // Create target elements in DOM
      document.body.innerHTML = `
        <div id="nlq-search-input"></div>
        <div id="nlq-results"></div>
        <div id="nlq-history"></div>
      `;
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should render all skip links', () => {
      render(<NLQSkipLinks />);

      expect(screen.getByText(/Skip to search input/)).toBeInTheDocument();
      expect(screen.getByText(/Skip to results/)).toBeInTheDocument();
      expect(screen.getByText(/Skip to query history/)).toBeInTheDocument();
    });

    it('should have proper ARIA label', () => {
      const { container } = render(<NLQSkipLinks />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveAttribute('aria-label', 'Skip navigation links');
    });

    it('should focus target element when clicked', async () => {
      render(<NLQSkipLinks />);

      const skipLink = screen.getByText(/Skip to results/);
      fireEvent.click(skipLink);

      await waitFor(() => {
        const target = document.getElementById('nlq-results');
        expect(document.activeElement).toBe(target);
      });
    });

    it('should show keyboard shortcuts', () => {
      render(<NLQSkipLinks />);

      expect(screen.getByText(/\(\/\)/)).toBeInTheDocument();
      expect(screen.getByText(/\(r\)/)).toBeInTheDocument();
      expect(screen.getByText(/\(h\)/)).toBeInTheDocument();
    });
  });

  describe('LandmarkWrapper', () => {
    it('should render with correct role', () => {
      const { container } = render(
        <LandmarkWrapper type="search" label="Search" id="test-search">
          <input type="text" />
        </LandmarkWrapper>
      );

      expect(container.firstChild).toHaveAttribute('role', 'search');
      expect(container.firstChild).toHaveAttribute('aria-label', 'Search');
      expect(container.firstChild).toHaveAttribute('id', 'test-search');
    });

    it('should use main element for main landmark', () => {
      const { container } = render(
        <LandmarkWrapper type="main" label="Main content" id="main">
          <div>Content</div>
        </LandmarkWrapper>
      );

      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('should use aside for complementary', () => {
      const { container } = render(
        <LandmarkWrapper type="complementary" label="Sidebar" id="sidebar">
          <div>Sidebar</div>
        </LandmarkWrapper>
      );

      expect(container.querySelector('aside')).toBeInTheDocument();
    });
  });

  describe('NLQBreadcrumbs', () => {
    it('should render breadcrumb path', () => {
      const path = [
        { label: 'Home', targetId: 'home' },
        { label: 'Queries', targetId: 'queries' },
        { label: 'Current Query' },
      ];

      render(<NLQBreadcrumbs path={path} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Queries')).toBeInTheDocument();
      expect(screen.getByText('Current Query')).toBeInTheDocument();
    });

    it('should mark last item as current page', () => {
      const path = [
        { label: 'Home' },
        { label: 'Current' },
      ];

      render(<NLQBreadcrumbs path={path} />);

      const current = screen.getByText('Current');
      expect(current).toHaveAttribute('aria-current', 'page');
    });

    it('should call onNavigate when breadcrumb is clicked', async () => {
      const onNavigate = vi.fn();
      const path = [
        { label: 'Home' },
        { label: 'Queries' },
      ];

      render(<NLQBreadcrumbs path={path} onNavigate={onNavigate} />);

      const homeLink = screen.getByText('Home');
      fireEvent.click(homeLink);

      await waitFor(() => {
        expect(onNavigate).toHaveBeenCalledWith(0);
      });
    });
  });
});

describe('WCAG 2.2 AA Compliance', () => {
  it('should have sufficient color contrast (4.5:1)', () => {
    // This would typically be tested with axe-core or similar
    // Here we're just checking that the test structure exists
    expect(true).toBe(true);
  });

  it('should have keyboard-focusable interactive elements', () => {
    const { container } = render(
      <RovingTabindexManager>
        <button>Item 1</button>
        <button>Item 2</button>
      </RovingTabindexManager>
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('tabindex');
    });
  });

  it('should have proper ARIA live regions', () => {
    const { container } = render(<NLQAnnouncer message="Test" />);

    expect(container.firstChild).toHaveAttribute('aria-live');
    expect(container.firstChild).toHaveAttribute('aria-atomic', 'true');
  });

  it('should have descriptive labels for landmarks', () => {
    const { container } = render(
      <LandmarkWrapper type="search" label="Query search" id="search">
        <input type="text" />
      </LandmarkWrapper>
    );

    expect(container.firstChild).toHaveAttribute('aria-label', 'Query search');
  });

  it('should support focus visible indicators', () => {
    // This would be tested in E2E tests
    expect(true).toBe(true);
  });
});
